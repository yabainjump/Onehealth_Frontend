import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { from, switchMap } from 'rxjs';

import { ApiService } from './api.service';

export interface UploadResponse {
  url: string;
  filename?: string;
  originalName?: string;
  mimetype?: string;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly api = inject(ApiService);

  uploadProfile(file: File): Observable<UploadResponse> {
    return from(this.prepareFile(file)).pipe(
      switchMap((preparedFile) => {
        const formData = new FormData();
        formData.append('file', preparedFile);
        return this.api.post<UploadResponse, FormData>('/upload/profile', formData);
      }),
    );
  }

  uploadPost(file: File): Observable<UploadResponse> {
    return from(this.prepareFile(file)).pipe(
      switchMap((preparedFile) => {
        const formData = new FormData();
        formData.append('file', preparedFile);
        return this.api.post<UploadResponse, FormData>('/upload/post', formData);
      }),
    );
  }

  uploadMessage(file: File): Observable<UploadResponse> {
    return from(this.prepareFile(file)).pipe(
      switchMap((preparedFile) => {
        const formData = new FormData();
        formData.append('file', preparedFile);
        return this.api.post<UploadResponse, FormData>('/upload/message', formData);
      }),
    );
  }

  private async prepareFile(file: File): Promise<File> {
    if (!file?.type?.startsWith('image/')) {
      return file;
    }

    if (file.type === 'image/gif') {
      return file;
    }

    // Keep small files untouched to avoid unnecessary CPU work on the client.
    if (file.size <= 450 * 1024) {
      return file;
    }

    try {
      return await this.compressImage(file, 1280, 0.78);
    } catch {
      return file;
    }
  }

  private async compressImage(
    file: File,
    maxDimension: number,
    quality: number,
  ): Promise<File> {
    const image = await this.loadImage(file);
    const { width, height } = this.computeDimensions(
      image.width,
      image.height,
      maxDimension,
    );

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', quality);
    });

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const outputName = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], outputName, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  }

  private computeDimensions(width: number, height: number, maxDimension: number) {
    if (width <= maxDimension && height <= maxDimension) {
      return { width, height };
    }

    const ratio = width > height ? maxDimension / width : maxDimension / height;
    return {
      width: Math.round(width * ratio),
      height: Math.round(height * ratio),
    };
  }

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };
      image.onerror = (error) => {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      };
      image.src = objectUrl;
    });
  }
}
