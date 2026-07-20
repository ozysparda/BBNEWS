import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Eye, Trash2, Download } from 'lucide-react';

interface Complaint {
  id: number;
  complaintNumber: string;
  fullName: string;
  email: string;
  category: string;
  title: string;
  status: string;
  createdAt: string;
  city: string;
  phoneNumber: string;
  description: string;
  photoUrl?: string;
  videoUrl?: string;
  pdfUrl?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  province?: string;
  country?: string;
  deviceName?: string;
  operatingSystem?: string;
  browser?: string;
  screenResolution?: string;
  ipAddress?: string;
  assignedOfficer?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
};

const STATUSES = ['pending', 'verified', 'in_progress', 'completed'];

export default function ComplaintManagement() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [assignedOfficer, setAssignedOfficer] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['complaints', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const response = await fetch(`/api/admin/complaints?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });

  const handleStatusUpdate = async () => {
    if (!selectedComplaint || !newStatus) {
      toast.error('Pilih status baru');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/complaints/${selectedComplaint.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
        },
        body: JSON.stringify({ status: newStatus, assignedOfficer: assignedOfficer || null }),
      });

      if (!response.ok) throw new Error('Update failed');

      toast.success('Status diperbarui');
      setIsDetailOpen(false);
      refetch();
    } catch (error) {
      toast.error('Gagal memperbarui status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus aduan ini?')) return;

    try {
      const response = await fetch(`/api/admin/complaints/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
      });

      if (!response.ok) throw new Error('Delete failed');

      toast.success('Aduan dihapus');
      refetch();
    } catch (error) {
      toast.error('Gagal menghapus aduan');
    }
  };

  const handleExport = () => {
    if (!data?.complaints) return;

    const csv = [
      ['No. Aduan', 'Nama', 'Email', 'Kategori', 'Judul', 'Status', 'Kota', 'Tanggal'].join(','),
      ...data.complaints.map((c: Complaint) =>
        [c.complaintNumber, c.fullName, c.email, c.category, c.title, c.status, c.city, new Date(c.createdAt).toLocaleDateString('id-ID')].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `complaints_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manajemen Aduan</h1>
          <p className="text-gray-600">Total: {data?.total || 0} aduan</p>
        </div>
        <Button onClick={handleExport} disabled={!data?.complaints?.length}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Cari no. aduan, nama, email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 min-w-[200px]"
        />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Semua Status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, ' ').charAt(0).toUpperCase() + s.replace(/_/g, ' ').slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Aduan</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : data?.complaints?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Tidak ada aduan
                </TableCell>
              </TableRow>
            ) : (
              data?.complaints?.map((complaint: Complaint) => (
                <TableRow key={complaint.id}>
                  <TableCell className="font-mono text-sm">{complaint.complaintNumber}</TableCell>
                  <TableCell>{complaint.fullName}</TableCell>
                  <TableCell>{complaint.category}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[complaint.status] || 'bg-gray-100'}>
                      {complaint.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(complaint.createdAt).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedComplaint(complaint);
                        setNewStatus(complaint.status);
                        setAssignedOfficer(complaint.assignedOfficer || '');
                        setIsDetailOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(complaint.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Halaman {page} dari {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(Math.min(data.totalPages, page + 1))}
              disabled={page === data.totalPages}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Aduan</DialogTitle>
            <DialogDescription>{selectedComplaint?.complaintNumber}</DialogDescription>
          </DialogHeader>

          {selectedComplaint && (
            <div className="space-y-4">
              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Nama</p>
                  <p>{selectedComplaint.fullName}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Email</p>
                  <p>{selectedComplaint.email}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Telepon</p>
                  <p>{selectedComplaint.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Kategori</p>
                  <p>{selectedComplaint.category}</p>
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Alamat</p>
                  <p>{selectedComplaint.address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600">Kota/Provinsi</p>
                  <p>{selectedComplaint.city || '-'} / {selectedComplaint.province || '-'}</p>
                </div>
                {selectedComplaint.latitude && selectedComplaint.longitude && (
                  <div className="col-span-2">
                    <p className="text-sm font-semibold text-gray-600">Koordinat</p>
                    <a
                      href={`https://maps.google.com/?q=${selectedComplaint.latitude},${selectedComplaint.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {selectedComplaint.latitude.toFixed(4)}, {selectedComplaint.longitude.toFixed(4)}
                    </a>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <p className="text-sm font-semibold text-gray-600">Judul</p>
                <p className="font-semibold">{selectedComplaint.title}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600">Deskripsi</p>
                <p className="whitespace-pre-wrap">{selectedComplaint.description}</p>
              </div>

              {/* Files */}
              {(selectedComplaint.photoUrl || selectedComplaint.videoUrl || selectedComplaint.pdfUrl) && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-600">File Terlampir</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedComplaint.photoUrl && (
                      <a href={selectedComplaint.photoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                        📷 Foto
                      </a>
                    )}
                    {selectedComplaint.videoUrl && (
                      <a href={selectedComplaint.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                        🎥 Video
                      </a>
                    )}
                    {selectedComplaint.pdfUrl && (
                      <a href={selectedComplaint.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                        📄 PDF
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Device Info */}
              <div className="bg-gray-100 p-4 rounded">
                <p className="text-sm font-semibold text-gray-600 mb-2">Informasi Perangkat</p>
                <div className="text-xs space-y-1">
                  <p>Device: {selectedComplaint.deviceName}</p>
                  <p>OS: {selectedComplaint.operatingSystem}</p>
                  <p>Browser: {selectedComplaint.browser}</p>
                  <p>IP: {selectedComplaint.ipAddress}</p>
                  <p>Screen: {selectedComplaint.screenResolution}</p>
                </div>
              </div>

              {/* Status Update */}
              <div className="border-t pt-4 space-y-3">
                <div>
                  <label className="text-sm font-semibold">Status</label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-semibold">Petugas yang Ditugaskan</label>
                  <Input
                    value={assignedOfficer}
                    onChange={(e) => setAssignedOfficer(e.target.value)}
                    placeholder="Nama petugas"
                  />
                </div>
                <Button onClick={handleStatusUpdate} disabled={isUpdating} className="w-full">
                  {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Perbarui'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
