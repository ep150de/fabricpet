// ============================================
// Ordinal Minter — Inscribe pets as Bitcoin ordinals
// ============================================

import type { Pet, OrdinalTrait } from '../types';
import { exportPetAsGLB } from '../rp1/GLBExporter';

export interface MintResult {
  success: boolean;
  inscriptionId?: string;
  inscriptionNumber?: number;
  error?: string;
}

export interface PetInscriptionData {
  name: string;
  description: string;
  petData: {
    id: string;
    name: string;
    level: number;
    stage: string;
    elementalType: string;
    battleStats: {
      hp: number;
      maxHp: number;
      atk: number;
      def: number;
      spd: number;
      special: number;
    };
    moves: string[];
    rarity?: string;
    generation?: number;
    parentIds?: [string, string];
  };
  contentType: 'image/png' | 'model/gltf-binary';
}

export async function canInscribe(): Promise<boolean> {
  return typeof window !== 'undefined' && !!window.unisat;
}

export async function getUnisatAddress(): Promise<string | null> {
  if (!window.unisat) return null;
  try {
    const accounts = await window.unisat.getAccounts();
    return accounts[0] || null;
  } catch {
    return null;
  }
}

export function isPetEligibleForMinting(pet: Pet): { eligible: boolean; reason?: string } {
  if (pet.stage === 'egg') {
    return { eligible: false, reason: 'Your pet must hatch before it can be inscribed as an ordinal.' };
  }
  if (pet.stage === 'baby') {
    return { eligible: false, reason: 'Your pet must grow past the baby stage before it can be inscribed.' };
  }
  if (pet.level < 10) {
    return { eligible: false, reason: 'Your pet must be at least level 10 to be inscribed as an ordinal.' };
  }
  return { eligible: true };
}

export function buildPetInscriptionMetadata(pet: Pet, ownerNpub?: string): PetInscriptionData {
  return {
    name: `${pet.name} - FabricPet`,
    description: `A level ${pet.level} ${pet.elementalType} FabricPet ${pet.stage}. Battle stats: HP ${pet.battleStats.hp}/${pet.battleStats.maxHp}, ATK ${pet.battleStats.atk}, DEF ${pet.battleStats.def}, SPD ${pet.battleStats.spd}, SPECIAL ${pet.battleStats.special}. Moves: ${pet.moves.join(', ')}.`,
    petData: {
      id: pet.id,
      name: pet.name,
      level: pet.level,
      stage: pet.stage,
      elementalType: pet.elementalType,
      battleStats: { ...pet.battleStats },
      moves: [...pet.moves],
      rarity: (pet as any).lineage?.rarity,
      generation: (pet as any).lineage?.generation,
      parentIds: (pet as any).lineage?.parentIds,
    },
    contentType: 'model/gltf-binary',
  };
}

export async function mintPetAsOrdinal(
  pet: Pet,
  ownerNpub?: string
): Promise<MintResult> {
  if (!window.unisat) {
    return { success: false, error: 'UniSat wallet not found. Please install the UniSat browser extension.' };
  }

  const eligibility = isPetEligibleForMinting(pet);
  if (!eligibility.eligible) {
    return { success: false, error: eligibility.reason };
  }

  try {
    const accounts = await window.unisat.requestAccounts();
    const address = accounts[0];

    const metadata = buildPetInscriptionMetadata(pet, ownerNpub);
    const metadataJson = JSON.stringify(metadata);

    const glbBlob = await exportPetAsGLB(pet, ownerNpub);
    const glbArrayBuffer = await glbBlob.arrayBuffer();

    const contentBase64 = btoa(
      String.fromCharCode(...new Uint8Array(glbArrayBuffer))
    );

    const inscriptionData = `data:application/octet-stream;base64,${contentBase64}`;

    console.log('[OrdinalMinter] Initiating ordinal inscription...');

    const result = await window.unisat.inscribe({
      data: [
        { data: inscriptionData },
      ],
      receiveAddress: address,
    });

    console.log('[OrdinalMinter] Inscription successful:', result);

    return {
      success: true,
      inscriptionId: result.inscriptionId,
      inscriptionNumber: result.inscriptionNumber,
    };
  } catch (error) {
    console.error('[OrdinalMinter] Inscription failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during inscription',
    };
  }
}

export function applyOrdinalTraitsToPet(
  pet: Pet,
  traits: OrdinalTrait[]
): Pet {
  if (!pet.ordinalTraits || pet.ordinalTraits.length === 0) {
    return pet;
  }

  const updatedPet = { ...pet };

  for (const trait of traits) {
    switch (trait.trait_type.toLowerCase()) {
      case 'background':
      case 'element':
        if (trait.value && [
          'fire', 'water', 'earth', 'air', 'light', 'dark', 'neutral'
        ].includes(trait.value.toLowerCase())) {
          updatedPet.elementalType = trait.value.toLowerCase() as Pet['elementalType'];
        }
        break;

      case 'rarity':
        if (trait.value && ['common', 'uncommon', 'rare', 'epic', 'legendary'].includes(trait.value.toLowerCase())) {
          (updatedPet as any).rarity = trait.value.toLowerCase();
        }
        break;

      case 'hp':
      case 'health':
        const hpBoost = parseInt(trait.value, 10);
        if (!isNaN(hpBoost) && hpBoost > 0) {
          updatedPet.battleStats = {
            ...updatedPet.battleStats,
            hp: updatedPet.battleStats.hp + hpBoost,
            maxHp: updatedPet.battleStats.maxHp + hpBoost,
          };
        }
        break;

      case 'attack':
      case 'atk':
        const atkBoost = parseInt(trait.value, 10);
        if (!isNaN(atkBoost) && atkBoost > 0) {
          updatedPet.battleStats = {
            ...updatedPet.battleStats,
            atk: updatedPet.battleStats.atk + atkBoost,
          };
        }
        break;

      case 'defense':
      case 'def':
        const defBoost = parseInt(trait.value, 10);
        if (!isNaN(defBoost) && defBoost > 0) {
          updatedPet.battleStats = {
            ...updatedPet.battleStats,
            def: updatedPet.battleStats.def + defBoost,
          };
        }
        break;

      case 'speed':
      case 'spd':
        const spdBoost = parseInt(trait.value, 10);
        if (!isNaN(spdBoost) && spdBoost > 0) {
          updatedPet.battleStats = {
            ...updatedPet.battleStats,
            spd: updatedPet.battleStats.spd + spdBoost,
          };
        }
        break;

      case 'special':
        const specialBoost = parseInt(trait.value, 10);
        if (!isNaN(specialBoost) && specialBoost > 0) {
          updatedPet.battleStats = {
            ...updatedPet.battleStats,
            special: updatedPet.battleStats.special + specialBoost,
          };
        }
        break;

      default:
        break;
    }
  }

  return updatedPet;
}

export function comparePetTraitsWithOrdinal(
  pet: Pet,
  ordinalTraits: OrdinalTrait[]
): { hasChanges: boolean; changes: string[] } {
  const changes: string[] = [];

  for (const trait of ordinalTraits) {
    switch (trait.trait_type.toLowerCase()) {
      case 'rarity':
        if ((pet as any).lineage?.rarity !== trait.value.toLowerCase()) {
          changes.push(`Rarity: ${(pet as any).lineage?.rarity || 'none'} → ${trait.value}`);
        }
        break;

      case 'hp':
      case 'health':
        const hpDiff = parseInt(trait.value, 10) - (pet.battleStats.maxHp - 75);
        if (hpDiff !== 0) {
          changes.push(`HP: +${hpDiff > 0 ? hpDiff : hpDiff}`);
        }
        break;

      default:
        break;
    }
  }

  return {
    hasChanges: changes.length > 0,
    changes,
  };
}