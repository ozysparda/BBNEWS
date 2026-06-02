export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatTime(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateTime(dateString: string) {
  return `${formatDate(dateString)} • ${formatTime(dateString)}`;
}
