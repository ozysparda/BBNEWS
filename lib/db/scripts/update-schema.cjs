const fs = require('fs');
const p = process.argv[2];
let t = fs.readFileSync(p, 'utf8');

const oldCampaign = [
  '  // QRIS / QR statis',
  '  qrisImageUrl: text("qris_image_url"),',
  '  qrisPayload: text("qris_payload"),',
  '',
  '  // Transfer bank manual',
  '  bankName: text("bank_name"),',
  '  bankAccountNumber: text("bank_account_number"),',
  '  bankAccountHolder: text("bank_account_holder"),',
  '',
  '  // Kripto (opsional, bisa dipakai bersamaan dengan QRIS)',
  '  cryptoNetwork: text("crypto_network"),',
  '  cryptoSymbol: text("crypto_symbol"),',
  '  cryptoAddress: text("crypto_address"),',
  '',
  '  // Auto konfirmasi: khusus kripto (cek tx hash ke explorer publik).',
  '  // Kalau gagal dicek, transaksi tetap "pending" untuk konfirmasi manual admin.',
  '  autoConfirm: boolean("auto_confirm").notNull().default(false),',
  '',
  '  // Minimum donasi (rupiah) supaya transaksi di bawahnya ditolak',
  '  minAmount: integer("min_amount").notNull().default(1000),',
  '',
  '  status: text("status").notNull().default("draft"),',
].join('\n');

const newCampaign = [
  '  // Minimum donasi (rupiah) supaya transaksi di bawahnya ditolak',
  '  // (opsional per campaign; jika null pakai global dari donation_settings)',
  '  minAmount: integer("min_amount"),',
  '',
  '  status: text("status").notNull().default("draft"),',
].join('\n');

if (t.includes(oldCampaign)) {
  t = t.replace(oldCampaign, newCampaign);
  console.log('Campaign fields removed OK');
} else {
  console.log('Campaign old pattern NOT FOUND');
}

const oldSettings = '  isOpen: boolean("is_open").notNull().default(true),\n\n  // Popup donasi (opsional) - tampilkan campaign donasi sebagai popup/iklan';
const newSettings = `  isOpen: boolean("is_open").notNull().default(true),

  // === Payment global (satu konfigurasi untuk semua campaign) ===
  // QRIS / QR statis
  qrisImageUrl: text("qris_image_url"),
  qrisPayload: text("qris_payload"),

  // Transfer bank manual
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountHolder: text("bank_account_holder"),

  // Kripto
  cryptoNetwork: text("crypto_network"),
  cryptoSymbol: text("crypto_symbol"),
  cryptoAddress: text("crypto_address"),

  // Auto konfirmasi: khusus kripto (cek tx hash ke explorer publik).
  autoConfirm: boolean("auto_confirm").notNull().default(false),

  // Minimum donasi global (rupiah)
  minAmount: integer("min_amount").notNull().default(1000),

  // Popup donasi (opsional) - tampilkan campaign donasi sebagai popup/iklan`;

if (t.includes(oldSettings)) {
  t = t.replace(oldSettings, newSettings);
  console.log('Settings payment fields added OK');
} else {
  console.log('Settings old pattern NOT FOUND');
}

fs.writeFileSync(p, t, 'utf8');
console.log('File written.');