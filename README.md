# BudgetZen FCFA — PWA

Application de budget personnel en français, conçue mobile-first et utilisant le FCFA.

## Fonctionnalités

- Enregistrement des revenus et dépenses par catégorie
- Suivi du solde disponible, des provisions et de l’épargne
- Budgets mensuels par catégorie et alertes de dépassement / seuil de 80 %
- Objectifs d’épargne
- Historique filtrable des opérations
- Graphique des dépenses par semaine du mois
- Export et restauration d’une sauvegarde JSON
- Stockage local du navigateur
- Manifest PWA et service worker pour l’installation et le cache hors connexion

## Lancer en local

Le service worker nécessite un serveur HTTP(S), pas l’ouverture directe en `file://`.

Avec Python installé, depuis ce dossier :

```bash
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

## Publier gratuitement sur GitHub Pages

1. Créer un dépôt GitHub (par exemple `budgetzen-fcfa`).
2. Ajouter tous les fichiers de ce dossier en conservant les dossiers `icons/`.
3. Ouvrir **Settings → Pages**.
4. Dans **Build and deployment**, sélectionner **Deploy from a branch**.
5. Choisir la branche `main` et le dossier `/ (root)`, puis enregistrer.
6. Attendre le déploiement et ouvrir l’adresse Pages fournie.

GitHub Pages sert le site en HTTPS, nécessaire au service worker et à l’installation PWA. Le chemin relatif des fichiers permet la publication dans un dépôt de projet.

## Installer

- **Android / Chrome** : ouvrir le site, menu ⋮, puis « Installer l’application » ou « Ajouter à l’écran d’accueil ».
- **iPhone / Safari** : ouvrir le site, Partager, puis « Sur l’écran d’accueil ».

## Données et confidentialité

Les données sont conservées dans `localStorage` sur le navigateur/appareil courant. Elles ne sont pas envoyées à un serveur. Les données du navigateur peuvent être supprimées par l’utilisateur ou le système : utilisez régulièrement **Sauvegarder** et gardez le fichier JSON en lieu sûr. La synchronisation entre appareils, le chiffrement applicatif et l’authentification ne sont pas inclus dans cette version locale.

## Notes de calcul

Solde disponible = revenus du mois − dépenses enregistrées − provision mensuelle réservée − montants des objectifs d’épargne affectés.

Les budgets de catégories servent au suivi et aux alertes; ils ne sont pas soustraits eux-mêmes du solde. Cela évite de compter deux fois une dépense après son enregistrement. L’épargne affectée aux objectifs est déduite du solde disponible global dans cette version.
