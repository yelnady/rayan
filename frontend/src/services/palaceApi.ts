import { apiDelete, apiGet, apiPatch, apiPost } from './api';
import type {
  CreatePalaceResponse,
  GetPalaceResponse,
  GetRoomResponse,
  RoomAccessResponse,
  UpdateLayoutRequest,
  UpdateLayoutResponse,
} from '../types/api';

export const palaceApi = {
  getPalace: () => apiGet<GetPalaceResponse>('/palace'),

  createPalace: () => apiPost<CreatePalaceResponse>('/palace'),

  updateLayout: (body: UpdateLayoutRequest) =>
    apiPatch<UpdateLayoutResponse>('/palace/layout', body),

  getRoom: (roomId: string) => apiGet<GetRoomResponse>(`/rooms/${roomId}`),

  accessRoom: (roomId: string) => apiPost<RoomAccessResponse>(`/rooms/${roomId}/access`),

  deleteRoom: (roomId: string) => apiDelete<{ success: boolean }>(`/rooms/${roomId}`),
};
