import React, { useState } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonButton, IonText, IonList, IonItem, IonLabel, IonIcon, useIonToast 
} from '@ionic/react';
import { playOutline, arrowForwardOutline, bluetoothOutline } from 'ionicons/icons';

const Home: React.FC = () => {
  const [present] = useIonToast();
  const [currentValue, setCurrentValue] = useState<number>(0.00);
  const [mesures, setMesures] = useState<{id: number, val: number, time: string}[]>([]);

  const handleNext = () => {
    const newM = { id: Date.now(), val: currentValue, time: new Date().toLocaleTimeString() };
    setMesures(prev => [newM, ...prev]);
    present({ message: 'Mesure enregistrée', duration: 1000, color: 'success' });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="dark">
          <IonTitle>ERT Line Logger</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#0a0a0a' }}>
        <div style={{ background: '#121212', borderRadius: '15px', padding: '20px', textAlign: 'center', marginBottom: '20px', border: '1px solid #333' }}>
          <IonText color="primary"><p>Live Monitoring</p></IonText>
          <h1 style={{ fontSize: '4rem', color: '#00f2ff', margin: '10px 0' }}>{currentValue.toFixed(2)}</h1>
          <IonText color="medium"><p>Current Resistance (R)</p></IonText>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <IonButton expand="block" color="success" style={{ flex: 1 }}>Démarrer</IonButton>
          <IonButton expand="block" color="warning" onClick={handleNext} style={{ flex: 1 }}>Suivante</IonButton>
        </div>

        <IonText color="light"><h3>Mesures ({mesures.length})</h3></IonText>
        <IonList style={{ background: 'transparent' }}>
          {mesures.map(m => (
            <IonItem key={m.id} style={{ '--background': '#1a1a1a', marginBottom: '5px', borderRadius: '10px' }}>
              <IonLabel><h2 style={{ color: '#fff' }}>{m.val} Ω</h2><p>{m.time}</p></IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Home;
