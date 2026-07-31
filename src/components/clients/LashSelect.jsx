import { withCurrentValue } from '../../utils/referentials';

/** Menu alimenté par une liste configurable dans les Paramètres.
 *
 *  `withCurrentValue` y réintègre la valeur déjà enregistrée sur la fiche même si elle a été
 *  retirée des réglages : sans cela, modifier une liste ferait silencieusement disparaître à
 *  l'écran une information saisie sur une cliente, et personne ne s'en apercevrait avant de
 *  rouvrir sa fiche.
 *
 *  L'option vide est volontaire : une fiche peut légitimement ne rien indiquer, et forcer un
 *  choix par défaut reviendrait à inventer une donnée qu'on n'a pas observée. */
export default function LashSelect({ id, label, options, value, onChange }) {
  return (
    <div className="field-group">
      <label className="field-label" htmlFor={id}>{label}</label>
      <select id={id} className="input-field" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {withCurrentValue(options, value).map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}
