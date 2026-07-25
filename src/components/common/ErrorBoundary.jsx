import { Component } from 'react';
import { reportCrash } from '../../utils/feedback';
import { APP_NAME } from '../../data/brand';
import styles from './ErrorBoundary.module.css';

/** Filet de sécurité global : sans lui, une erreur de rendu laisse un écran blanc, sans
 * aucun message ni trace — le pire scénario pendant une beta. Ici on affiche un écran
 * lisible et on remonte l'erreur automatiquement.
 *
 * Doit rester une classe : React n'expose pas encore d'équivalent en composant fonction. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || '' };
  }

  componentDidCatch(error, info) {
    reportCrash(error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className={styles.wrap}>
        <div className={styles.card}>
          <h1 className={styles.title}>Une erreur est survenue</h1>
          <p className={styles.text}>
            Désolé, cette page n'a pas pu s'afficher. Le problème a été signalé automatiquement
            à l'équipe de {APP_NAME} — tes données ne sont pas perdues.
          </p>
          {this.state.message && <p className={styles.detail}>{this.state.message}</p>}
          <div className={styles.actions}>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Recharger la page
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { window.location.href = '/'; }}>
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }
}
