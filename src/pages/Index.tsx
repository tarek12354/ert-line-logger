import React, { useState } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonButton, IonText, IonList, IonItem, IonLabel, IonBadge, IonIcon, useIonToast 
} from '@ionic/react';
import { playOutline, arrowForwardOutline, bluetoothOutline, statsChartOutline } from 'ionicons/icons';

const Home: React.FC = () => {
  const [present] = useIonToast();
  const [currentValue, setCurrentValue] = useState<number>(0.00);
  const [mesures, setMesures] = useState<{id: number, val: number, time: string}[]>([]);

  const handleNext = () => {
    if (currentValue >= 0) {
      const newM = {
        id: Date.now(),
        val: currentValue,
        time: new Date().toLocaleTimeString()
      };
      setMesures(prev => [newM, ...prev]);
      present({ message: 'Mesure enregistrée', duration: 1000, color: 'success' });
    }
  };

  return (
    <IonPage style={{ background: '#0a0a0a' }}>
      <IonHeader>
        <IonToolbar color="dark">
          <IonTitle>ERT Line Logger</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#0a0a0a' }}>
        {/* قسم المراقبة المباشرة - Live Monitoring */}
        <div style={{
          background: '#121212', borderRadius: '15px', padding: '20px',
          border: '1px solid #333', textAlign: 'center', marginBottom: '20px'
        }}>
          <IonText color="primary"><p>Live Monitoring</p></IonText>
          <h1 style={{ fontSize: '4rem', color: '#00f2ff', margin: '10px 0' }}>
            {currentValue.toFixed(2)}
          </h1>
          <IonText color="medium"><p>Current Resistance (R)</p></IonText>
        </div>

        {/* الأزرار الملونة كما في تصميمك */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <IonButton expand="block" color="success" style={{ flex: 1, height: '50px' }}>
            <IonIcon slot="start" icon={playOutline} /> Démarrer
          </IonButton>
          <IonButton expand="block" color="warning" onClick={handleNext} style={{ flex: 1, height: '50px' }}>
            <IonIcon slot="start" icon={arrowForwardOutline} /> Suivante
          </IonButton>
        </div>

        {/* قائمة القياسات الاحترافية */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <IonText color="light"><h3>Mesures</h3></IonText>
          <IonBadge color="primary">{mesures.length}</IonBadge>
        </div>

        <IonList style={{ background: 'transparent' }}>
          {mesures.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
              Aucune mesure enregistrée
            </div>
          ) : (
            mesures.map(m => (
              <IonItem key={m.id} style={{ '--background': '#1a1a1a', marginBottom: '5px', borderRadius: '10px' }}>
                <IonLabel>
                  <h2 style={{ color: '#fff' }}>{m.val} Ω</h2>
                  <p style={{ color: '#888' }}>{m.time}</p>
                </IonLabel>
                <IonIcon icon={statsChartOutline} slot="end" color="primary" />
              </IonItem>
            ))
          )}
        </IonList>

        <div style={{ textAlign: 'center', marginTop: '20px', color: '#444', fontSize: '0.8rem' }}>
          <IonIcon icon={bluetoothOutline} /> Raw BLE: Receiving...
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
