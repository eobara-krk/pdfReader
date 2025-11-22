import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SpeechSynthesisService {
  private utterance: SpeechSynthesisUtterance | null = null;
  private lastText: string = '';

  /** Rozpocznij czytanie tekstu. Jeśli tekst jest taki sam i jest w pauzie, wznowi. Jeśli inny lub nie czyta, zacznie od początku. */
  speak(text: string, lang: string = 'pl-PL', onEnd?: () => void, onError?: () => void) {
    const synth = window.speechSynthesis;
    if (synth.paused && this.lastText === text) {
      synth.resume();
      return;
    }
    if (synth.speaking) {
      synth.cancel();
    }
    this.utterance = new window.SpeechSynthesisUtterance(text);
    this.utterance.lang = lang;
    this.utterance.onend = () => {
      this.utterance = null;
      this.lastText = '';
      if (onEnd) onEnd();
    };
    this.utterance.onerror = () => {
      this.utterance = null;
      this.lastText = '';
      if (onError) onError();
    };
    this.lastText = text;
    synth.speak(this.utterance);
  }


  /** Wznowienie czytania po pauzie */
  resume() {
    const synth = window.speechSynthesis;
    if (synth.paused) {
      synth.resume();
    }
  }

  /** Zatrzymaj czytanie i wyczyść kontekst */
  stop() {
    const synth = window.speechSynthesis;
    synth.cancel();
    this.utterance = null;
    this.lastText = '';
  }

  /** Czy trwa czytanie? */
  isSpeaking(): boolean {
    return window.speechSynthesis.speaking;
  }


  /** Jaki tekst był ostatnio czytany? */
  getLastText(): string {
    return this.lastText;
  }
}
