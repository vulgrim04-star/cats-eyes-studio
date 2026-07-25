import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { enterDemo } from '../utils/demoMode';

/** Point d'entrée de la démonstration (/demo) : charge le jeu fictif puis renvoie sur le
 * tableau de bord. Une page dédiée plutôt qu'un bouton, pour pouvoir partager le lien tel
 * quel sur les réseaux. */
export default function DemoEntry() {
  const navigate = useNavigate();

  useEffect(() => {
    enterDemo();
    navigate('/', { replace: true });
  }, [navigate]);

  return null;
}
