"use client";
import { createContext } from "react";

export interface OpenArtifact { code: string; lang: string }

/** Permite que um ArtifactCard (aninhado no markdown) abra o painel lateral. */
export const ArtifactContext = createContext<{ open: (a: OpenArtifact) => void } | null>(null);
