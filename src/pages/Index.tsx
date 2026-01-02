import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, 
  IonButton, IonText, IonList, IonItem, IonLabel, useIonToast 
} from '@ionic/react';
import React, { useState } from 'react';

const Home: React.FC = () => {
  const [present] = useIonToast();
  // نفترض أن هذه القيمة تأتي من الحساس (سنضع قيمة ثابتة للاختبار الآن)
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [mesures, setMesures] = useState<{id: number, val: number, time: string}[]>([]);

  const handleNext = () => {
    // التحقق: إذا كانت القيمة 0 أو غير موجودة لا يحفظ
    if (currentValue > 0) {
      const newM = {
        id: Date.now(),
        val: currentValue,
        time: new Date().toLocaleTimeString()
      };
      setMesures([newM, ...mesures]);
      present({ message: 'تم الحفظ', duration: 1000, color: 'success' });
    } else {
      // رسالة الخطأ التي ظهرت لك في الصورة
      present({ message: 'En attente de données du capteur...', duration: 2000, color: 'warning' });
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>ERT Project</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <IonText color="dark">
            <h2>القيمة الحالية</h2>
            <h1 style={{ fontSize: '3rem' }}>{currentValue.toFixed(2)}</h1>
          </IonText>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <IonButton expand="block" style={{ flex: 1 }} color="success">Démarrer</IonButton>
            <IonButton expand="block" style={{ flex: 1 }} color="warning" onClick={handleNext}>Suivante</IonButton>
          </div>
        </div>

        <IonList>
          <IonHeader className="ion-padding-start">Mesures ({mesures.length})</IonHeader>
          {mesures.map(m => (
            <IonItem key={m.id}>
              <IonLabel>
                <h2>{m.val} Ω</h2>
                <p>{m.time}</p>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Home;
