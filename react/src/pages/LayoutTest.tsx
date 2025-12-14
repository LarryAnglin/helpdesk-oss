/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import AppLayout from '@/components/layout/AppLayout';

export default function LayoutTest() {
  return (
    <AppLayout>
      <div className="bg-red-500 w-full h-screen">
        <div className="bg-green-500 h-20 w-full text-white text-2xl p-4">
          This green bar should be right next to the menu
        </div>
        <div className="bg-blue-500 h-20 w-full text-white text-2xl p-4">
          This blue bar is below the green one
        </div>
        <div className="bg-yellow-500 h-20 w-full text-white text-2xl p-4">
          If there's white space to the left, that's the issue
        </div>
      </div>
    </AppLayout>
  );
}