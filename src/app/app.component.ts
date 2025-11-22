function customReplacements(text: string): string {
  // Zamiana 'św.' na 'święty', 'Jan Paweł II' na 'Jan Paweł drugi', 'Rz' na 'Rzymian', cyfry arabskie na słowa
  let replaced = text.replace(/św\./gi, 'święty')
    .replace(/Jan Paweł II\.?/gi, 'Jan Paweł drugi')
    .replace(/\bRz\b/g, 'Rzymian');
  // Zamiana 'II' bezpośrednio po 'Jan Paweł' na 'drugi' (gdyby coś zostało)
  replaced = replaced.replace(/(Jan Paweł) II/gi, '$1 drugi');
  // Zamiana cyfr arabskich 1-30 na polskie słowa
  replaced = replaced.replace(/\b([1-9]|1[0-9]|2[0-9]|30)\b/g, (match) => arabicToPolish[parseInt(match)] || match);
  return replaced;
}
// Map for roman numerals to arabic numbers
const romanToArabicMap: { [key: string]: number } = {
  I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000
};

// Map for arabic numbers to Polish words (1-30 for demo)
const arabicToPolish: { [key: number]: string } = {
  1: 'jeden', 2: 'dwa', 3: 'trzy', 4: 'cztery', 5: 'pięć', 6: 'sześć', 7: 'siedem', 8: 'osiem', 9: 'dziewięć', 10: 'dziesięć',
  11: 'jedenaście', 12: 'dwanaście', 13: 'trzynaście', 14: 'czternaście', 15: 'piętnaście', 16: 'szesnaście', 17: 'siedemnaście', 18: 'osiemnaście', 19: 'dziewiętnaście', 20: 'dwadzieścia',
  21: 'dwadzieścia jeden', 22: 'dwadzieścia dwa', 23: 'dwadzieścia trzy', 24: 'dwadzieścia cztery', 25: 'dwadzieścia pięć', 26: 'dwadzieścia sześć', 27: 'dwadzieścia siedem', 28: 'dwadzieścia osiem', 29: 'dwadzieścia dziewięć', 30: 'trzydzieści'
};

function romanToArabic(roman: string): number {
  let num = 0;
  let prev = 0;
  for (let i = roman.length - 1; i >= 0; i--) {
    const curr = romanToArabicMap[roman[i]] || 0;
    if (curr < prev) {
      num -= curr;
    } else {
      num += curr;
    }
    prev = curr;
  }
  return num;
}

function replaceRomanNumeralsWithPolish(text: string): string {
  return text.replace(/\b([IVXLCDM]{1,5})\b/g, (match) => {
    const arabic = romanToArabic(match);
    return arabicToPolish[arabic] || match;
  });
}

import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
declare const window: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit {
  private utterance: SpeechSynthesisUtterance | null = null;

  speakSectionText(): void {
    if ('speechSynthesis' in window && this.selectedSectionText) {
      // Zawsze zatrzymaj wszelkie dźwięki przed nowym startem
      window.speechSynthesis.cancel();
      this.utterance = null;
      let textToRead = replaceRomanNumeralsWithPolish(this.selectedSectionText);
      textToRead = customReplacements(textToRead);
      this.utterance = new window.SpeechSynthesisUtterance(textToRead);
  this.utterance!.lang = 'pl-PL';
  this.utterance!.onend = () => { this.utterance = null; };
  window.speechSynthesis.speak(this.utterance!);
    } else {
      window.alert('Syntezator mowy nie jest dostępny lub brak tekstu.');
    }
  }

  pauseSpeech(): void {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }

  resumeSpeech(): void {
    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  stopSpeech(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.utterance = null;
    }
  }
  selectedSectionText: string = '';
  private fullHtml: string = '';
  pdfPages: string[] = [];
  selectedPage: number = 0;

  async loadWord() {
    await this.showWordToc();
    this.selectedPage = 0;
  }

  async showWordToc() {
    console.log('Start showWordToc');
    if (!window['mammoth']) {
      console.log('Ładuję mammoth.js');
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.7.0/mammoth.browser.min.js';
      script.onload = () => {
        window['mammoth'] = window['mammoth'] || window['mammoth'];
        console.log('Załadowano mammoth.js');
        this.showWordToc();
      };
      document.body.appendChild(script);
      return;
    }
    console.log('Fetch word1.docx');
    const response = await fetch('/word1.docx');
    console.log('Pobrano plik Word');
    const arrayBuffer = await response.arrayBuffer();
    console.log('Zamieniono na arrayBuffer');
    const mammoth: any = window['mammoth'];
    const result = await mammoth.convertToHtml({arrayBuffer});
    console.log('Wynik mammoth:', result.value);
    // Extract TOC directly from HTML
    const html = result.value;
    this.fullHtml = html;
    // Find all <a href="#_Toc...">...</a> links (spis treści)
    const tocMatches = Array.from(html.matchAll(/<a href="#_Toc\d+">.*?<\/a>/g)) as RegExpMatchArray[];
    const tocLinks = tocMatches.map(m => m[0]);
    if (tocLinks.length > 0) {
      this.pdfPages = [ tocLinks.map(a => `<p>${a}</p>`).join('') ];
    } else {
      this.pdfPages = [ '<div>Nie znaleziono spisu treści w pliku Word.</div>' ];
    }
  }

  // Handler for TOC link click
  onTocClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target && target.tagName === 'A') {
      event.preventDefault();
      const href = target.getAttribute('href');
      if (href && href.startsWith('#_Toc')) {
        this.displaySectionByAnchor(href);
      }
    }
    }

    // Find and read section by anchor (href)
    displaySectionByAnchor(href: string): void {
      const html = this.fullHtml;
      // Szukaj anchoru <a id="..."></a>
      const anchorId = href.replace('#', '');
      const anchorRegex = new RegExp(`<a id="${anchorId}"></a>`, 'i');
      const anchorMatch = html.match(anchorRegex);
      if (!anchorMatch || anchorMatch.index === undefined) {
        this.selectedSectionText = 'Nie znaleziono początku sekcji.';
        return;
      }
      const startIdx = anchorMatch.index;
      // Znajdź kolejny anchor <a id="_TocXXXX"></a> po startIdx
  const nextAnchorRegex = /<a id="_Toc\d+"><\/a>/g;
      nextAnchorRegex.lastIndex = startIdx + 1;
      const nextAnchorMatch = nextAnchorRegex.exec(html);
      const endIdx = nextAnchorMatch ? nextAnchorMatch.index : html.length;
      const sectionHtml = html.substring(startIdx, endIdx);
      const sectionText = sectionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      this.selectedSectionText = sectionText || 'Nie znaleziono treści tej sekcji.';
    }

  async ngAfterViewInit() {
    await this.showWordToc();
    this.selectedPage = 0;
  }
}