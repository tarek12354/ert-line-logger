import React, { useState, useEffect } from 'react';

// استخدام مكونات HTML عادية لتجنب أخطاء استيراد Ionic في GitHub Actions
const Home: React.FC = () => {
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [mesures, setMesures] = useState<{id: number, val: number, time: string}[]>([]);

  const handleNext = () => {
    // محاكاة استلام بيانات (تأكد من ربطها لاحقاً بالبلوتوث)
    if (currentValue >= 0) {
      const newM = {
        id: Date.now(),
        val: currentValue,
        time: new Date().toLocaleTimeString()
      };
      setMesures(prev => [newM, ...prev]);
    }
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#121212', color: 'white', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        <h2>ERT Line Logger</h2>
      </header>

      <main style={{ marginTop: '30px' }}>
        <p>Live Monitoring</p>
        <h1 style={{ fontSize: '4rem', color: '#00f2ff' }}>{currentValue.toFixed(2)}</h1>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
          <button style={{ padding: '10px 20px', backgroundColor: '#2dd36f', border: 'none', borderRadius: '5px', color: 'white' }}>Démarrer</button>
          <button onClick={handleNext} style={{ padding: '10px 20px', backgroundColor: '#ffc409', border: 'none', borderRadius: '5px', color: 'black' }}>Suivante</button>
        </div>

        <section style={{ marginTop: '40px', textAlign: 'left' }}>
          <h3>Mesures ({mesures.length})</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {mesures.map(m => (
              <li key={m.id} style={{ padding: '10px', borderBottom: '1px solid #333' }}>
                <strong>{m.val} Ω</strong> - <small>{m.time}</small>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
};

export default Home;
