import { useState } from 'react'
import HomePage from './components/HomePage'
import EPACalculator from './components/EPACalculator'
import NGSTerminal from './components/NGSTerminal'

function App() {
  const [activeView, setActiveView] = useState('home')

  if (activeView === 'home') {
    return <HomePage onNavigate={setActiveView} />
  }

  if (activeView === 'calculator') {
    return <EPACalculator onNavigate={() => setActiveView('home')} />
  }

  return <NGSTerminal onNavigate={() => setActiveView('home')} />
}

export default App
