# Career Transition OS Mobile

A mobile-first app for tracking a person's full transition from one job to the next: applications, recruiter calls, resumes, cover letters, interviews, follow-ups, contacts, and offers.

## Current Build

This project now contains an Expo / React Native scaffold for the mobile app described in the product brief, plus the original static preview under `app/`.

The native app includes:

- React Native navigation with dashboard, sync, pipeline, documents, and interviews tabs
- SQLite persistence module for saved opportunities
- Job portal sync engine that normalizes LinkedIn, Naukri, Indeed, browser extension, and email parsing records
- Calendar integration for interview reminders
- File storage for imported resumes and cover letters
- AI helper service for resume matching, cover-letter drafting, and follow-up reminders

Run the native app:

```bash
npm install
npm run start
```

Optional AI setup:

```bash
EXPO_PUBLIC_OPENAI_API_KEY=your_key_here npm run start
```

Open the static fallback preview:

`app/index.html`

## Core Screens

- Dashboard: summary of active search, metrics, due follow-ups, and next interviews
- Pipeline: opportunity list with stage filters
- Opportunity detail: stage, next action, documents sent, and timeline
- Document studio: resume versions, role-match score, and resume content
- Interview planner: upcoming interviews and prep questions
- Quick add: add a new opportunity from the floating action button

## Product Direction

The app should become a personal job-transition operating system. The first user experience should answer one question immediately:

> What needs my attention right now in my job switch?

The app should avoid feeling like a generic spreadsheet. It should combine a pipeline, document workspace, calendar, contact tracker, and follow-up assistant into one focused mobile experience.

## Native App Stack

- Expo / React Native
- SQLite or Supabase for saved opportunities
- Calendar integration for interviews
- File storage for resumes and cover letters
- AI-assisted resume matching, cover-letter drafting, and follow-up reminders

## MVP Data Model

Primary entities:

- Opportunity
- Company
- Contact
- ResumeVersion
- CoverLetter
- Interview
- FollowUpTask
- ActivityLog

## Near-Term Roadmap

1. Install dependencies and run the Expo app on iOS, Android, or web.
2. Replace seed records with SQLite-backed create and edit flows.
3. Connect real job portal/browser-extension/email ingestion.
4. Add Supabase sync if cross-device backup is needed.
5. Add authenticated file storage for resumes and cover letters.
6. Expand AI workflows into reviewed, user-approved drafts.
