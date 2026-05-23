import { PublicUser } from './user.models';

export interface ChatRoom {
  id: string;
  members: string[];
  otherUser: PublicUser | null;
  lastMessage: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  imageUrl: string;
  fileUrl: string;
  fileName: string;
  fileMimeType: string;
  fileSize: number;
  isRead?: boolean;
  createdAt: string;
}

export interface CreateRoomRequest {
  memberId: string;
}

export interface SendMessageRequest {
  text?: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSize?: number;
}
