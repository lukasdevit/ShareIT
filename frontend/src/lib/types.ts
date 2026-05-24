export interface FileInfo {
  id: number;
  filename: string;
  original_name: string;
  size: number;
  mime_type: string;
  created_at: string;
}

export interface StorageInfo {
  used: number;
  limit: number;
}

export interface UserInfo {
  id: number;
  username: string;
  isAdmin: boolean;
}

export interface AdminUserRow {
  id: number;
  username: string;
  created_at: string;
  storage_limit: number;
  is_admin: number;
  used: number;
  file_count: number;
}
