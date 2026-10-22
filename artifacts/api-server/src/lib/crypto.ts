/**
 * Berugak Donasi - helper verifikasi transaksi kripto lewat explorer publik.
 *
 * dipakai supaya donasi kripto bisa terkonfirmasi otomatis (auto-verified)
 * tanpa perlu admin buka panel. Kalau explorer tidak bisa dihubungi atau
 * datanya belum lengkap, transaksi dibiarkan "pending" untuk konfirmasi manual.
 *
 * Explorer yang dipakai (gratis, tanpa API key):
 *  - TRON  : https://api.trongrid.io/wallet/gettransactionbyid
 *  - EVM   : https://api.blockchair.com/<db>/transactions?q=transaction_id(<hash>)
 *  - BTC   : https://api.blockchair.com/bitcoin/transactions?q=transaction_id(<hash>)
 */

export type CryptoNetworkKey = "tron" | "ethereum" | "bnb" | "bitcoin";

export interface CryptoTxResult {
  found: boolean;
  confirmed: boolean;
  amount?: number;
  recipient?: string;
  note?: string;
}

/** Normalisasi nama jaringan yang diketik admin / donatur. */
export function normalizeCryptoNetwork(value: string | null | undefined): CryptoNetworkKey | null {
  if (!value) return null;
  const v = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (v.includes("tron") || v.includes("trc") || v.includes("trx")) return "tron";
  if (v.includes("bitcoin") || v === "btc") return "bitcoin";
  if (v.includes("bnb") || v.includes("binance") || v.includes("bep")) return "bnb";
  if (v.includes("eth") || v.includes("erc") || v.includes("ethereum")) return "ethereum";
  return null;
}

const BLOCKCHAIR_DB: Record<CryptoNetworkKey, string> = {
  tron: "",
  ethereum: "ethereum",
  bnb: "binance-smart-chain",
  bitcoin: "bitcoin",
};

async function fetchJson(url: string, timeoutMs = 12000): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "berugaknews-donation/1.0" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** TRON: txid_hex -> { confirmed, amount (dari token contract), recipient } */
async function verifyTron(txHash: string): Promise<CryptoTxResult> {
  const json = await fetchJson(
    `https://api.trongrid.io/wallet/gettransactionbyid?value=${encodeURIComponent(txHash)}`,
  );
  if (!json) return { found: false, confirmed: false, note: "explorer tidak merespons" };

  const data = json?.data;
  if (!data) return { found: false, confirmed: false, note: "transaksi belum tercatat di jaringan" };

  const contractRet = data?.ret?.[0]?.contractRet?.[0];
  const ok =
    contractRet?.result === "SUCCESS" ||
    data?.ret?.[0]?.result === "SUCCESS" ||
    data?.result === "SUCCESS";
  if (!ok) {
    return { found: true, confirmed: false, note: "transaksi di jaringan berstatus gagal" };
  }

  const contractResult = Array.isArray(data?.contractResult) ? data.contractResult[0] : null;
  let amount: number | undefined;
  let recipient: string | undefined;

  if (contractResult) {
    recipient = contractResult.contract_address || undefined;
    const decimals =
      typeof contractResult.token_info?.decimals === "number" ? contractResult.token_info.decimals : 6;
    const receive = Number(contractResult.receive_amount ?? NaN);
    if (Number.isFinite(receive)) amount = receive / Math.pow(10, decimals);
  }

  return { found: true, confirmed: true, amount, recipient };
}

/** Blockchair (EVM + BTC) */
async function verifyBlockchair(network: CryptoNetworkKey, txHash: string): Promise<CryptoTxResult> {
  const dbName = BLOCKCHAIR_DB[network];
  if (!dbName) return { found: false, confirmed: false, note: "jaringan tidak didukung" };

  const url = `https://api.blockchair.com/${dbName}/transactions?q=transaction_id(${encodeURIComponent(
    txHash,
  )})`;
  const json = await fetchJson(url);
  if (!json) return { found: false, confirmed: false, note: "explorer tidak merespons" };

  const entry = json?.data?.[txHash];
  if (!entry) {
    const alt = json?.data ? Object.values(json.data)[0] : null;
    if (!alt) return { found: false, confirmed: false, note: "transaksi tidak ditemukan" };
    return { found: false, confirmed: false, note: "transaksi tidak ditemukan" };
  }

  const tx = entry?.transaction;
  const blockHeight = tx?.block_height;
  const confirmed = blockHeight !== null && blockHeight !== undefined && blockHeight > 0;

  let amount: number | undefined;
  if (network === "bitcoin") {
    const sats = Number(tx?.transfer_total ?? NaN);
    if (Number.isFinite(sats)) amount = sats / 1e8;
  } else {
    const eth = Number(tx?.transfer_amount ?? NaN);
    if (Number.isFinite(eth)) amount = eth;
  }

  const recipient = Array.isArray(tx?.inputs) ? tx.inputs[0]?.recipient : undefined;

  return {
    found: true,
    confirmed,
    amount,
    recipient,
    note: confirmed ? undefined : "transaksi belum masuk blok",
  };
}

/**
 * Verifikasi satu transaksi kripto.
 * `expectedRecipient` dipakai untuk mengecek apakah dana dikirim ke alamat campaign.
 */
export async function verifyCryptoTransaction(
  network: string | null | undefined,
  txHash: string,
  expectedRecipient?: string | null,
): Promise<CryptoTxResult> {
  const key = normalizeCryptoNetwork(network);
  if (!key) return { found: false, confirmed: false, note: "jaringan kripto tidak dikenali" };
  if (!txHash || txHash.trim().length < 16) {
    return { found: false, confirmed: false, note: "tx hash tidak valid" };
  }

  const hash = txHash.trim();
  const result = key === "tron" ? await verifyTron(hash) : await verifyBlockchair(key, hash);

  if (!result.confirmed) return result;

  if (expectedRecipient && result.recipient) {
    const a = result.recipient.toLowerCase().replace(/^0x/, "");
    const b = expectedRecipient.toLowerCase().replace(/^0x/, "");
    if (a !== b) {
      return {
        ...result,
        confirmed: false,
        note: "penerima transaksi tidak sama dengan alamat campaign",
      };
    }
  }

  return result;
}
