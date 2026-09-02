# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences with equal priority:

**Couples** — mariés ou futurs mariés organisant leur propre mariage, souvent avec des familles multiculturelles ou géographiquement dispersées. Ils gèrent plusieurs cérémonies (coutumière, civile, religieuse) et ont besoin d'un outil simple qui centralise tout sans imposer une courbe d'apprentissage.

**Organisateurs professionnels (wedding planners)** — professionnels gérant plusieurs mariages en parallèle pour leurs clients. Ils ont besoin d'un espace de travail multi-mariages, d'un calendrier, et des mêmes outils que les couples, à une échelle supérieure.

## Product Purpose

Plateforme de gestion des invités de mariage pensée nativement pour les mariages à plusieurs cérémonies. Elle permet aux couples et aux organisateurs de gérer, inviter, et accueillir leurs invités pour chaque cérémonie — coutumière, civile, religieuse — depuis un seul endroit.

Le succès ressemble à : un couple avec 300 invités répartis sur trois cérémonies qui gère tout sans tableur, sans double saisie, et sans stress le jour J.

## Positioning

"La seule plateforme pensée pour les mariages à plusieurs cérémonies."

Chaque cérémonie a sa propre liste d'invités, ses propres invitations, son propre plan de table — tout rattaché à un seul mariage. Aucun concurrent généraliste ne modélise la cérémonie comme entité de premier ordre.

## Operating Context

- Les couples organisent leur mariage sur une période de 6 à 18 mois avant le jour J.
- Les planners jonglent entre plusieurs mariages actifs en simultané.
- Le jour J, l'accueil se fait depuis un smartphone (scan QR code à l'entrée) — aucune application installée requise côté invité.
- Les invités reçoivent leurs invitations par e-mail, SMS ou WhatsApp et confirment via un lien personnalisé.
- Le produit est en français (public francophone prioritaire). L'architecture i18n est en place pour une future expansion.

## Capabilities and Constraints

**Fonctionnalités planifiées :**
- Plusieurs cérémonies par mariage, chacune avec liste d'invités, invitations, plan de table indépendants
- Invitations digitales (e-mail, SMS, WhatsApp) et PDF avec QR code unique par invité
- RSVP en ligne : confirmation de présence, préférences de repas, accompagnants
- Plan de table interactif (drag & drop), exportable pour traiteur/salle
- Accueil le jour J via scan QR code depuis un téléphone, comptage temps réel
- Groupes et filtres d'invités (côté marié, côté mariée, VIP, famille…)
- Calendrier multi-mariages pour les organisateurs

**État actuel :** authentification complète (inscription, connexion, mot de passe oublié), landing page, architecture de routage i18n. Le domaine métier (Wedding, Ceremony, Guest…) n'est pas encore modélisé en base.

**Contraintes techniques :** Next.js 16, React 19, Prisma 7 + PostgreSQL, NextAuth v5, next-intl v4, Tailwind CSS, shadcn/ui.

## Brand Commitments

- Nom : **WeddingApp** (placeholder — nom définitif non décidé)
- Langue principale : français
- Voix : claire, rassurante, sans jargon — parle à des non-techniciens qui vivent un moment important

## Pricing

| Segment | Plan | Prix | Limites |
|---|---|---|---|
| Couple | Gratuit | 0 € | 50 invités, 1 mariage |
| Couple | Essentiel | 29 € / mariage | Invités illimités, toutes cérémonies, plan de table, QR check-in |
| Planner | Starter | 49 € / mois | 5 mariages actifs |
| Planner | Pro | 99 € / mois | (fonctionnalités avancées — détail à confirmer) |

Freemium : gratuit pour commencer, aucune carte bancaire requise.

## Evidence on Hand

Aucun témoignage client, benchmark, ni chiffre de trafic réel à ce stade. Le produit est en phase de construction initiale. Ne pas fabriquer de preuves sociales dans les designs futurs.

## Product Principles

1. **La cérémonie est une entité de premier ordre.** Toute décision d'architecture UI ou de données doit composer naturellement avec l'existence de plusieurs cérémonies par mariage.
2. **Le jour J ne tolère pas la friction.** L'accueil, le check-in, le plan de table consulté à la dernière minute — tout doit fonctionner sans onboarding supplémentaire, sur n'importe quel téléphone.
3. **Simplicité pour le couple, puissance pour le pro.** Le même outil sert les deux audiences sans les opposer : les planners ont plus de scope, pas une interface différente.
4. **Pas de carte bancaire pour commencer.** La confiance précède la conversion — l'expérience gratuite doit être assez complète pour qu'un couple puisse réellement s'en servir.
5. **Français d'abord, international ensuite.** L'i18n est en place mais le contenu, la voix et les exemples restent ancrés dans le contexte francophone jusqu'à validation du marché.

## Accessibility & Inclusion

Aucune exigence spécifique établie. Le QR check-in doit fonctionner sans application native côté invité — accessibilité web standard requise.
