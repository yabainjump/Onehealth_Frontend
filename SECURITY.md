# Politique de sécurité — application Ionic

## Périmètre et frontières
Application web/PWA communautaire publique et authentifiée : comptes, profils, publications, médias, alertes, messagerie et Rudolf. Contenu utilisateur, images et réponses externes sont non fiables ; le backend est l’autorité des accès.

## Invariants
- Ne jamais placer de clé API, secret, mot de passe ou jeton de test dans les bundles, assets, logs ou exemples.
- Garder l’échappement du contenu, la CSP et le service worker compatibles avec les origines nécessaires, sans autoriser globalement les scripts ou connexions.
- Les profils, messages, médias privés et actions admin requièrent une autorisation backend par propriétaire/rôle ; les gardes de navigation ne sont pas suffisants.
- Valider taille, type et destination des uploads côté serveur ; le client ne peut que compléter ce contrôle.
- Éviter qu’un cache ou une session précédente expose des données privées après déconnexion ou changement de compte.
- Distinguer alertes communautaires, vérification humaine et réponses assistives de Rudolf ; ne rien présenter comme décision sanitaire officielle sans autorité.

## Signalements pertinents
Signaler XSS exploitable, fuite de session ou de média privé, accès inter-utilisateur, élévation admin ou contournement réaliste des protections. Vérifier entrée contrôlée, atteignabilité, protection serveur et impact avant de conclure.

## Limites
Les publications et photos de profil rendues publiques sont accessibles par URL ; cela ne vaut pas pour les pièces jointes privées. Aucune exclusion ni vulnérabilité acceptée n’est approuvée ici.
