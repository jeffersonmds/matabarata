import type { LevelData } from '../logic/level';
import cozinha1 from './cozinha-1.json';
import cozinha2 from './cozinha-2.json';
import cozinha3 from './cozinha-3.json';
import cozinha4 from './cozinha-4.json';
import cozinha5 from './cozinha-5.json';

// Ordem da campanha. O JSON chega sem os tipos literais; a validação de cada fase está em logic/level.test.ts.
export const LEVELS = [cozinha1, cozinha2, cozinha3, cozinha4, cozinha5] as unknown as LevelData[];
