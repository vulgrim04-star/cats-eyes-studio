import LegalDocument from '../components/common/LegalDocument';
import { PRIVACY_SECTIONS } from '../data/legalText';

export default function Privacy() {
  return (
    <LegalDocument
      title="Politique de confidentialité"
      intro="Comment vos données et celles de vos clientes sont traitées dans l'application."
      sections={PRIVACY_SECTIONS}
      otherLink={{ to: '/conditions', label: "Conditions d'utilisation" }}
    />
  );
}
