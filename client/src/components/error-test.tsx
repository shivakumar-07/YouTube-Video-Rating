import React from 'react';

interface ErrorTestProps {
  shouldThrow?: boolean;
}

export default function ErrorTest({ shouldThrow = false }: ErrorTestProps) {
  if (shouldThrow) {
    throw new Error('Test error for error boundary');
  }

  return (
    <div className="p-4 bg-green-100 border border-green-400 rounded">
      <h3 className="text-green-800 font-bold">Error Boundary Test</h3>
      <p className="text-green-700">This component is working correctly!</p>
      <button 
        className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        onClick={() => {
          throw new Error('Manual error trigger');
        }}
      >
        Trigger Error
      </button>
    </div>
  );
} 