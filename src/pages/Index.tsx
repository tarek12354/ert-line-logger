import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonButton, IonText, IonList, IonItem, IonLabel, IonNote, IonIcon, useIonToast 
} from '@ionic/react';
import { saveOutline, statsChartOutline, bluetoothOutline } from 'ionicons/icons';
import React, { useState, useEffect } from 'react';
import './Home.css';

// تعريف واجهة البيانات لكل قياس
interface Measure {
  id: number;
  value: number;
  time: string;
}

const Home: React.FC = () => {
  const [present] = useIonToast();
  // القيمة الحالية المستلمة من البلوتوث
  const [currentResistance, setCurrentResistance] = useState<number | null>(null);
  // قائمة القياسات المحفوظة
  const [mesures, setMesures] = useState<Measure[]>([]);
  // حالة الاتصال (لأغراض العرض فقط)
  const [isReceiving, setIsReceiving] = useState<boolean>(true);

  // دالة التعامل مع زر "Suivante"
  const handleNextClick = () => {
    // التحقق من وجود قيمة حقيقية مستلمة (ليست null وليست 0)
    if (currentResistance !== null && currentResistance > 0) {
      const newMeasure: Measure = {
        id: Date.now(),
        value: currentResistance,
        time: new Date().toLocaleTimeString()
      };

      // إضافة القياس الجديد إلى أعلى القائمة
      setMesures(prev => [newMeasure, ...prev]);

      present({
        message: `تم حفظ القياس: ${currentResistance} Ω`,
        duration: 1500,
        color: 'success',
        position: 'bottom'
      });

      // اختياري: تصفير القيمة الحالية لانتظار القراءة القادمة
      // setCurrentResistance(null); 
    } else {
      // التنبيه الذي ظهر لك في الصورة (عدم وجود بيانات)
      present({
        message: 'En attente de données du capteur...',
        duration: 2000,
        color: 'warning',
        position: 'bottom'
      });
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="dark">
          <IonTitle>ERT Line Logger</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding ion-text-center">
        {/* قسم العرض المباشر (الذي ظهر في صورتك) */}
        <div className="monitoring-card" style={{
          background: '#1a1a1a', padding: '20px', borderRadius: '15px', 
          border: '1px solid #333', marginBottom: '20px'
        }}>
          <IonText color="primary">
            <p style={{ margin: '0' }}>Live Monitoring</p>
          </IonText>
          
          <h1 style={{ fontSize: '3.5rem', margin: '10px 0', color: '#00f2ff' }}>
            {currentResistance !== null ? currentResistance.toFixed(2) : '---'}
          </h1>
          
          <IonText color="medium">
            <p>Current Resistance (R)</p>
          </IonText>
        </div>

        {/* أزرار التحكم */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <IonButton expand="block" color="success" style={{ flex: 1 }}>
            Démarrer
          </IonButton>
          <IonButton expand="block" color="warning" onClick={handleNextClick} style={{ flex: 1 }}>
            Suivante
          </IonButton>
        </div>

        {/* قائمة القياسات (Mesures) */}
        <div className="mesures-section" style={{ textAlign: 'left' }}>
          <IonText color="light">
            <h3 style={{ marginLeft: '10px' }}>
              <IonIcon icon={statsChartOutline} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
              Mesures ({mesures.length})
            </h3>
          </IonText>

          <IonList lines="full" style={{ borderRadius: '10px', overflow: 'hidden' }}>
            {mesures.length === 0 ? (
              <IonItem>
                <IonLabel className="ion-text-center" color="medium">Aucune mesure enregistrée</IonLabel>
              </IonItem>
            ) : (
              mesures.map(m => (
                <IonItem key={m.id}>
                  <IonLabel>
                    <h2>{m.value} Ω</h2>
                    <p>الوقت: {m.time}</p>
                  </IonLabel>
                  <IonNote slot="end" color="primary">#{mesures.indexOf(m) + 1}</IonNote>
                </IonItem>
              ))
            )}
          </IonList>
        </div>

        {/* شريط الحالة الأسفل */}
        <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#666' }}>
          <IonIcon icon={bluetoothOutline} /> Raw BLE: {isReceiving ? 'Receiving...' : 'Disconnected'}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
