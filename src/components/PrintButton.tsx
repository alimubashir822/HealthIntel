'use client';

import React from 'react';
import { Printer } from 'lucide-react';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-505 dark:hover:bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
    >
      <Printer className="h-3.5 w-3.5" />
      <span>Print Report</span>
    </button>
  );
}
