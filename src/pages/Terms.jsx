import LegalDocument from '../components/common/LegalDocument';
import { TERMS_SECTIONS } from '../data/legalText';

export default function Terms() {
  return (
    <LegalDocument
      title="Conditions d'utilisation"
      intro="Le cadre dans lequel l'application est mise à votre disposition."
      sections={TERMS_SECTIONS}
      otherLink={{ to: '/confidentialite', label: 'Politique de confidentialité' }}
    />
  );
}
