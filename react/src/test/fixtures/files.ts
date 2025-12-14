/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

export const createMockFile = (
  name: string = 'test.png',
  size: number = 1024,
  type: string = 'image/png'
): File => {
  const file = new File(['mock file content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

export const createMockFileList = (files: File[]): FileList => {
  const fileList = {
    item: (index: number) => files[index],
    ...files
  };
  return fileList as FileList;
};

export const mockFiles = {
  validImage: createMockFile('image.png', 1024, 'image/png'),
  validPdf: createMockFile('document.pdf', 2048, 'application/pdf'),
  validDoc: createMockFile('document.docx', 1536, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  oversizedFile: createMockFile('large.png', 15 * 1024 * 1024, 'image/png'), // 15MB
  invalidType: createMockFile('virus.exe', 1024, 'application/x-msdownload'),
  emptyFile: createMockFile('empty.txt', 0, 'text/plain')
};