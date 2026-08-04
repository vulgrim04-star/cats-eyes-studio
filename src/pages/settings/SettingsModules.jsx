import SettingsPage from '../../components/settings/SettingsPage';
import Icon from '../../components/common/Icon';
import Toggle from '../../components/common/Toggle';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { MODULES, canDisable, toggleModule } from '../../utils/modules';

/** Choix des modules affichés dans le studio.
 *
 *  Tous les salons ne font pas tout : trois onglets chez qui n'en utilise qu'un, c'est de
 *  l'encombrement payé pour rien. Retirer un module ne touche à AUCUNE donnée — c'est ce
 *  que dit l'encart, parce que « désactiver » se lit facilement comme « supprimer ».
 */
export default function SettingsModules() {
  const { modules, setModules } = useSettings();
  const { showToast } = useToast();

  const handleToggle = (id, label) => {
    if (modules[id] && !canDisable(modules, id)) {
      showToast('Au moins un module doit rester actif', 'warning');
      return;
    }
    setModules(toggleModule(modules, id));
    showToast(modules[id] ? `${label} masqué` : `${label} affiché`, 'success');
  };

  return (
    <SettingsPage title="Modules" subtitle="Choisis ce qui s’affiche dans le studio">
      <div className="card">
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-soft)', margin: '0 0 var(--space-4)', lineHeight: 1.5 }}>
          Masquer un module <strong>n’efface aucune donnée</strong> : les fiches et les séances
          restent enregistrées et réapparaissent telles quelles si tu le réactives.
        </p>

        {MODULES.map((module) => {
          const active = modules[module.id];
          const locked = active && !canDisable(modules, module.id);
          return (
            <div
              key={module.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: active ? 'var(--color-accent-light)' : 'var(--color-cream)',
                  color: active ? 'var(--color-accent-dark)' : 'var(--color-text-muted)',
                }}
              >
                <Icon name={module.icon} size={18} />
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{module.label}</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                  {locked ? 'Dernier module actif — il ne peut pas être masqué.' : module.hint}
                </div>
              </div>

              <Toggle
                active={active}
                onChange={() => handleToggle(module.id, module.label)}
                label={`Afficher ${module.label}`}
                disabled={locked}
              />
            </div>
          );
        })}
      </div>
    </SettingsPage>
  );
}
