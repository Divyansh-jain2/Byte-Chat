'use client';

import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { FiUpload, FiRotateCw, FiX, FiCheck } from 'react-icons/fi';
import { useToast } from '@/contexts/ToastContext';

interface ImageUploaderProps {
  currentImage?: string;
  onImageUpload: (file: File) => Promise<void>;
  onImageDelete?: () => Promise<void>;
  isLoading?: boolean;
  aspectRatio?: number;
  title?: string;
  showDelete?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  currentImage,
  onImageUpload,
  onImageDelete,
  isLoading = false,
  aspectRatio = 1,
  title = 'Upload Image',
  showDelete = true,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 50,
    height: 50,
    x: 25,
    y: 25,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toast = useToast();

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setShowEditor(true);
        setRotation(0);
        setCrop({
          unit: '%',
          width: 50,
          height: 50,
          x: 25,
          y: 25,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Rotate image
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Generate cropped and rotated image
  const getCroppedImg = useCallback(async (): Promise<File | null> => {
    if (!completedCrop || !imgRef.current || !canvasRef.current) {
      return null;
    }

    const image = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Calculate dimensions for rotated image
    const rotRad = (rotation * Math.PI) / 180;
    const rotatedWidth =
      Math.abs(Math.cos(rotRad) * completedCrop.width * scaleX) +
      Math.abs(Math.sin(rotRad) * completedCrop.height * scaleY);
    const rotatedHeight =
      Math.abs(Math.sin(rotRad) * completedCrop.width * scaleX) +
      Math.abs(Math.cos(rotRad) * completedCrop.height * scaleY);

    canvas.width = rotatedWidth;
    canvas.height = rotatedHeight;

    ctx.save();
    ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
    ctx.rotate(rotRad);
    ctx.translate(-rotatedWidth / 2, -rotatedHeight / 2);

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      (rotatedWidth - completedCrop.width * scaleX) / 2,
      (rotatedHeight - completedCrop.height * scaleY) / 2,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const file = new File([blob], 'profile-picture.jpg', {
            type: 'image/jpeg',
          });
          resolve(file);
        },
        'image/jpeg',
        0.95
      );
    });
  }, [completedCrop, rotation]);

  // Handle upload
  const handleUpload = async () => {
    const croppedFile = await getCroppedImg();
    if (croppedFile) {
      await onImageUpload(croppedFile);
      setShowEditor(false);
      setSelectedImage(null);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setShowEditor(false);
    setSelectedImage(null);
    setRotation(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>

      {/* Current Image Display */}
      {!showEditor && currentImage && (
        <div className="mb-4">
          <img
            src={currentImage}
            alt="Current"
            className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 mx-auto"
          />
        </div>
      )}

      {/* Image Editor */}
      {showEditor && selectedImage && (
        <div className="mb-4 p-4 border rounded-lg bg-gray-50">
          <div className="mb-4">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              className="max-w-full mx-auto"
            >
              <img
                ref={imgRef}
                src={selectedImage}
                alt="Crop preview"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  maxHeight: '400px',
                }}
                className="max-w-full"
              />
            </ReactCrop>
          </div>

          {/* Editor Controls */}
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={handleRotate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              disabled={isLoading}
            >
              <FiRotateCw /> Rotate
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
              disabled={isLoading}
            >
              <FiX /> Cancel
            </button>
            <button
              onClick={handleUpload}
              className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
              disabled={isLoading}
            >
              {isLoading ? (
                <>Processing...</>
              ) : (
                <>
                  <FiCheck /> Save Image
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Hidden Canvas for Image Processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Upload/Delete Buttons */}
      {!showEditor && (
        <div className="flex justify-center gap-4">
          <label className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 transition">
            <FiUpload />
            {currentImage ? 'Change Image' : 'Upload Image'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isLoading}
            />
          </label>

          {showDelete && currentImage && onImageDelete && (
            <button
              onClick={onImageDelete}
              className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              disabled={isLoading}
            >
              <FiX />
              {isLoading ? 'Deleting...' : 'Delete Image'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
