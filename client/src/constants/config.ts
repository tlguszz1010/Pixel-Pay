import { Platform } from "react-native";

// Android 에뮬레이터는 10.0.2.2, iOS 시뮬레이터/웹은 localhost
const LOCALHOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";

export const API_BASE_URL = `http://${LOCALHOST}:4000`;

// __DEV__ 모드에서 mock 엔드포인트 사용 (DALL-E 크레딧 절약)
export const USE_MOCK_GENERATE = false;
