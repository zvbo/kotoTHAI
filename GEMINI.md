## Project Overview

This is a React Native mobile application built with Expo. The app's primary function is to provide real-time voice translation. It utilizes WebRTC for real-time communication and features a tab-based navigation system using `expo-router`. The app's state is managed with a combination of React Context and Zustand.

**Key Technologies:**

*   **Framework:** React Native with Expo
*   **Navigation:** Expo Router
*   **Real-time Communication:** WebRTC (`react-native-webrtc`)
*   **State Management:** React Context, Zustand
*   **UI:** NativeWind (Tailwind CSS for React Native), custom design system
*   **Language:** TypeScript

**Architecture:**

The application is structured with a clear separation of concerns:

*   **`app/`:** Contains the navigation and screen components, following the `expo-router` file-based routing convention.
*   **`components/`:** Reusable UI components.
*   **`constants/`:** Application-wide constants like colors, languages, and legal information.
*   **`context/`:** React Context providers for global state management.
*   **`hooks/`:** Custom hooks for managing complex logic like audio recording, translation, and real-time communication.
*   **`styles/`:** Global styles and a design system.
*   **`utils/`:** Utility functions.

## Building and Running

To run the application in a development environment, use the following commands:

*   **Start the development server:**
    ```bash
    npm start
    ```
*   **Run on iOS:**
    ```bash
    npm run ios
    ```
*   **Run on Android:**
    ```bash
    npm run android
    ```
*   **Run on Web:**
    ```bash
    npm run start-web
    ```

## Development Conventions

*   **Styling:** The project uses NativeWind for styling, which allows for the use of Tailwind CSS classes in React Native. A custom design system is also defined in `styles/designSystem.ts`.
*   **State Management:** Global state is managed using a combination of React Context (see `context/AppContext.tsx`) and Zustand.
*   **Navigation:** The app uses `expo-router` for file-based routing. The navigation structure is defined in the `app/` directory.
*   **Linting and Formatting:** TODO: Add information about linting and formatting conventions if available.
