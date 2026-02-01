import { useState } from 'react'
import EPACalculator from './components/EPACalculator'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header - Simplified and reduced prominence */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-3">
            {/* Clean SVG icon instead of emoji */}
            <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 4c0-.55.45-1 1-1h14c.55 0 1 .45 1 1v16c0 .55-.45 1-1 1H5c-.55 0-1-.45-1-1V4zm2 1v14h12V5H6zm6 2l4 4-4 4V9z"/>
            </svg>
            <h1 className="text-4xl font-bold text-gray-900">
              NFL EPA & Win Probability
            </h1>
          </div>
          <p className="text-base text-gray-600">
            Advanced game analytics powered by XGBoost ML
          </p>
        </header>

        <EPACalculator />

        {/* Footer - Mobile responsive */}
        <footer className="mt-16 text-center">
          <div className="bg-white rounded-xl px-6 py-5 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Training Data</div>
                <div className="text-base font-bold text-gray-900">{(285657).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">MAE</div>
                <div className="text-base font-bold text-gray-900">0.23</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">R²</div>
                <div className="text-base font-bold text-gray-900">0.96</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Calibration</div>
                <div className="text-base font-bold text-gray-900">0.006</div>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              2016-2024 NFL Seasons
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default App
