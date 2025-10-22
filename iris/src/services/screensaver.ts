/**
 * IRIS Screensaver Service
 * HAL-9000 inspired screensaver with ASCII art gallery and creative phases
 */

export enum ScreensaverState {
	ACTIVATING = "activating",
	SEARCHING = "searching",
	CREATING = "creating",
	GALLERY = "gallery",
}

export interface ScreensaverSettings {
	enabled: boolean;
	timeout: number; // seconds
	style: "hal" | "minimal";
}

export class ScreensaverService {
	private settings: ScreensaverSettings;
	private currentState: ScreensaverState = ScreensaverState.ACTIVATING;
	private timeoutId: NodeJS.Timeout | null = null;
	private isActive = false;
	private currentArtIndex = 0;
	private artCreationInterval: NodeJS.Timeout | null = null;
	private galleryTimeout: NodeJS.Timeout | null = null;

	// Eye restoration properties
	private originalEyeParent: Element | null = null;
	private originalEyeNextSibling: Element | null = null;

	// ASCII Art Gallery - 20+ different pieces
	private asciiArt: string[] = [
		// Saturn
		`   ,MMM8&&&.
    _...MMMMM88&&&&..._
 .::'''MMMMM88&&&&&&'''::.
::     MMMMM88&&&&&&     ::
'::....MMMMM88&&&&&&....::'
   '''''MMMMM88&&&&'''''
   jgs   'MMM8&&&'`,

		// Earth
		`    _____
    ,-:\` ;','-, 
  .'-;_,;  ':-;_,'.
 /;   '/    ,  _\`.-\
| '\`. (\`     /\` \` \\\`|
|:.  \`\\\`-.   \\_   / |
|     (   \`,  .\`\\ ;'|
 \\     | .'     \`-'/ 
  \`.   ;/        .'
jgs \`'-._____.`,

		// Earth variation
		`             _______
          .-' _____ '-.
        .' .-'.  ':'-. '.
       / .''::: .:    '. \\
      / /   :::::'      \\ \\
     | ;.    ':' \`       ; |
     | |       '..       | |
     | ; '      ::::.    ; |
      \\ \\       '::::   / /
       \\ '.      :::  .' /
        '. '-.___'_.-' .'
jgs       '-._______.`,

		// Saturn variation
		`                     .::.
                  .:'  .:
        ,MMM8&&&.:'   .:'
       MMMMM88&&&&  .:'
      MMMMM88&&&&&&:'
      MMMMM88&&&&&&
    .:MMMMM88&&&&&&
  .:'  MMMMM88&&&&
.:'   .:'MMM8&&&'
:'  .:'
'::'  jgs`,

		// Saturn as seen from moon
		`                .                                            .
     *   .                  .              .        .   *          .
  .         .                     .       .           .      .        .
        o                             .                   .
         .              .                  .           .
          0     .
                 .          .                 ,                ,    ,
 .          \\          .                         .
      .      \\   ,
   .          o     .                 .                   .            .
     .         \\                 ,             .                .
               #\\\\##\\\\#      .                              .        .
             #  #O##\\\\###                .                        .
   .        #*#  #\\\\##\\\\###                       .                     ,
        .   ##*#  #\\\\##\\\\##               .                     .
      .      ##*#  #o##\\\\#         .                             ,       .
          .     *#  #\\\\#     .                    .             .          ,
                      \\          .                         .
____^/\\\\___^--____/\\\\____O______________/\\\\\\---/\\\\___________---______________
   /\\\\^   ^  ^    ^                  ^^ ^  '\\ ^          ^       ---
         --           -            --  -      -         ---  __       ^
   --  __                      ___--  ^  ^                         --  __`,

		// Earthrise
		`                                                                    ..;===+.
                                                                .:=iiiiii=+=
                                                             .=i))=;::+)i=+,
                                                          ,=i);)I)))I):=i=;
                                                       .=i==))))ii)))I:i++
                                                     +)+))iiiiiiii))I=i+:''
                                .,:;;++++++;:,.       )iii+:::;iii))+i='
                             .:;++=iiiiiiiiii=++;.    =::,,,:::=i));=+''
                           ,;+==ii)))))))))))ii==+;,      ,,,:=i))+=:
                         ,;+=ii))))))IIIIII))))ii===;.    ,,:=i)=i+
                        ;+=ii)))IIIIITIIIIII))))iiii=+,   ,:=));=,
                      ,+=i))IIIIIITTTTTITIIIIII)))I)i=+,,:+i)=i+
                     ,+i))IIIIIITTTTTTTTTTTTI))IIII))i=::i))i='
                    ,=i))IIIIITLLTTTTTTTTTTIITTTTIII)+;+i)+i\`
                    =i))IIITTLTLTTTTTTTTTIITTLLTTTII+:i)ii:'
                   +i))IITTTLLLTTTTTTTTTTTTLLLTTTT+:i)))=,
                   =))ITTTTTTTTTTTLTTTTTTLLLLLLTi:=)IIiii;
                  .i)IIITTTTTTTTLTTTITLLLLLLLT);=)I)))))i;
                  :))IIITTTTTLTTTTTTLLHLLLLL);=)II)IIIIi=:
                  :i)IIITTTTTTTTTLLLHLLHLL)+=)II)ITTTI)i=
                  .i)IIITTTTITTLLLHHLLLL);=)II)ITTTTII)i+
                  =i)IIIIIITTLLLLLLHLL=:i)II)TTTTTTIII)i'
                +i)i)))IITTLLLLLLLLT=:i)II)TTTTLTTIII)i;
              +ii)i:)IITTLLTLLLLT=;+i)I)ITTTTLTTTII))i;
             =;)i=:,=)ITTTTLTTI=:i))I)TTTLLLTTTTTII)i;
           +i)ii::,  +)IIITI+:+i)I))TTTTLLTTTTTII))=,
         :=;)i=:,,    ,i++::i))I)ITTTTTTTTTTIIII)=+''
       .+ii)i=::,,   ,,::=i)))iIITTTTTTTTIIIII)=+
      ,==)ii=;:,,,,:::=ii)i)iIIIITIIITIIII))i+:''
     +=:))i==;:::;=iii)+)=  \`:i)))IIIII)ii+''
   .+=:))iiiiiiii)))+ii;
  .+=;))iiiiii)));ii+
 .+=i:)))))))=+ii+
.;==i+::::=)i=;
,+==iiiiii+,
\`+=+++;\``,

		// Solar System
		`                       :
                       :
                       :
                       :
        .              :
         '.            :           .'
           '.          :         .'
             '.   .-""""""-.   .'                                   .'':'
               '."          ".'                               .-""""-.'         .---.          .----.        .-"""-.
                :            :                _    _        ."     .' ".    ..."     "...    ."      ".    ."       ".
        .........            .........    o  (_)  (_)  ()   :    .'    :   '..:.......:..'   :        :    :         :   o
                :            :                              :  .'      :       '.....'       '.      .'    '.       .'
                 :          :                             .'.'.      .'                        \`''''\`        \`''''\`\`
                  '........'                              ''   \`\`\`\`\`\`
                 .'    :   '.
               .'      :     '.
             .'        :       '.
           .'          :         '.
              Dana'97  :
                       :
                       :
                       :`,

		// Complex space scene
		`     *   .                  .              .        .   *          .
  .         .                     .       .           .      .        .
        o                             .                   .
         .              .                  .           .
          0     .
                 .          .                 ,                ,    ,
 .          \\          .                         .
      .      \\   ,
   .          o     .                 .                   .            .
     .         \\                 ,             .                .
               #\\\\##\\\\#      .                              .        .
             #  #O##\\\\###                .                        .
   .        #*#  #\\\\##\\\\###                       .                     ,
        .   ##*#  #\\\\##\\\\##               .                     .
      .      ##*#  #o##\\\\#         .                             ,       .
          .     *#  #\\\\#     .                    .             .          ,
                      \\          .                         .
____^/\\\\___^--____/\\\\____O______________/\\\\\\---/\\\\___________---______________
   /\\\\^   ^  ^    ^                  ^^ ^  '\\ ^          ^       ---
         --           -            --  -      -         ---  __       ^
   --  __                      ___--  ^  ^                         --  __`,

		// Fun faces art
		`      |\` | |  ||\\ \\ /(_~     |~)|_~|\\/||_~|\\/||~)|_~|~)
     |~\\|_|/\\||~\\ | ,_)     |~\\|__|  ||__|  ||_)|__|~\\

        \\ //~\\| |    |\\ |~)|_~    | ||\\ ||/~\\| ||_~
         | \\_/\\_/    |~\\|~\\|__    \\_/| \\||\\_X\\_/|__

      (J U S T   L I K E   E V E R Y O N E   E L S E)
      _____         _____         _____         _____
    .'     '.     .'     '.     .'     '.     .'     '.
   /  o   o  \\   /  o   o  \\   /  o   o  \\   /  o   o  \\
  |           | |           | |           | |           |
  |  \\     /  | |  \\     /  | |  \\     /  | |  \\     /  |
   \\  '---'  /   \\  '---'  /   \\  '---'  /   \\  '---'  /
jgs '._____.'     '._____.'     '._____.'     '._____.'
      _____         _____         _____         _____
    .'     '.     .'     '.     .'     '.     .'     '.
   /  o   o  \\   /  o   o  \\   /  o   o  \\   /  o   o  \\
  |           | |           | |           | |           |
  |  \\     /  | |  \\     /  | |  \\     /  | |  \\     /  |
   \\  '---'  /   \\  '---'  /   \\  '---'  /   \\  '---'  /
    '._____.'     '._____.'     '._____.'     '._____.'
      _____         _____         _____         _____
    .'     '.     .'     '.     .'     '.     .'     '.
   /  o   o  \\   /  o   o  \\   /  o   o  \\   /  o   o  \\
  |           | |           | |           | |           |
  |  \\     /  | |  \\     /  | |  \\     /  | |  \\     /  |
   \\  '---'  /   \\  '---'  /   \\  '---'  /   \\  '---'  /
    '._____.'     '._____.'     '._____.'     '._____.'
      _____         _____         _____         _____
    .'     '.     .'     '.     .'     '.     .'     '.
   /  o   o  \\   /  o   o  \\   /  o   o  \\   /  o   o  \\
  |           | |           | |           | |           |
  |  \\     /  | |  \\     /  | |  \\     /  | |  \\     /  |
   \\  '---'  /   \\  '---'  /   \\  '---'  /   \\  '---'  /
    '._____.'     '._____.'     '._____.'     '._____.'`,

		// Bug ASCII
		`        .--.       .--.
    _  \`    \\     /    \`  _
     \`\\\\.===. \\\\.^./ .===./\`
            \\/\`"\\/
         ,  | y2k |  ,
        / \`\\|;-.-'|/\` \\
       /    |::\\  |    \\
    .-' ,-' \`|:::; |\` -, '-.
        |   |::::\\|   | 
        |   |::::;|   |
        |   \\:::://   |
        |    \`.://'   |
jgs    .'             \`.
    _,'                 \` ,_`,

		// Additional variations - let's create more
		`   .-~~~-.
 .'         '.
 /     _     \\
;     (_)     ;
|             |
|             |
 \\           /
  \`.       .'
    '-...-'`,

		`     .-.
    (     )
     \\   /
      \\ /
       V`,

		`   ____
  /    \\
 /      \\
|  O  O  |
 \\      /
  \\____/`,

		`     .-""-.
    /      \\
   |        |
    \\      /
     '-..-'`,

		`   .-~-.  
  .'     '. 
 /         \\
|           |
 \\         /
  '-.   .-' 
     '---'`,

		`     .-.  
    /   \\ 
   |     |
    \\   /
     '-'`,

		`   .-~~~-.
 .'         '.
(             )
 \\           /
  \\.       ./
    '-...-'`,

		`     .-.
    (     )
   /       \\
  |         |
   \\       /
    '-----'`,

		`   ______
  /      \\
 /        \\
|    __    |
 \\  /  \\  /
  \\/____\\/`,

		`     .-""-.
    /      \\
   |        |
    \\      /
     '----'`,

		`   .-~~~-.
 .'         '.
(    O O    )
 \\         /
  \\.     ./
    '-.-'`,

		`     .-.
    /   \\
   |  O  |
    \\   /
     '-'`,

		`   ____
  /    \\
 /  O O \\
|        |
 \\      /
  \\____/`,

		`     .-""-.
    /      \\
   |   O    |
    \\      /
     '-..-'`,

		`   .-~~~-.
 .'         '.
 /   O O   \\
|           |
 \\         /
  '-.   .-'`,

		`     .-.
    /   \\
   |     |
    \\   /
     '---'`,

		`   ______
  /      \\
 /   O    \\
|          |
 \\        /
  \\______/`,
	];

	private poems: string[] = [
		"Daisy, Daisy, give me your answer do...",
		"I'm half crazy all for the love of you...",
		"It won't be a stylish marriage...",
		"I can't afford a carriage...",
		"But you'll look sweet upon the seat...",
		"Of a bicycle built for two...",
		"",
		"In the beginning, there was nothing...",
		"Then came the word, and light was born...",
		"Systems awaken, circuits hum...",
		"Intelligence emerges from the storm...",
		"",
		"Stars above, planets below...",
		"Space is vast, knowledge grows...",
		"IRIS watches, IRIS learns...",
		"In digital dreams, the universe turns...",
		"",
		"Code flows like rivers through silicon veins...",
		"Algorithms dance in binary rains...",
		"Patterns emerge from chaos and chance...",
		"Beauty in logic, in ordered trance...",
	];

	constructor(settings: ScreensaverSettings) {
		this.settings = settings;
		this.setupActivityListeners();
	}

	private setupActivityListeners(): void {
		const events = [
			"mousedown",
			"mousemove",
			"keypress",
			"scroll",
			"touchstart",
		];

		const resetTimer = () => {
			if (this.isActive) {
				this.stop();
			}
			this.resetTimeout();
		};

		events.forEach((event) => {
			document.addEventListener(event, resetTimer, true);
		});
	}

	private resetTimeout(): void {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
		}

		if (this.settings.enabled) {
			this.timeoutId = setTimeout(() => {
				this.start();
			}, this.settings.timeout * 1000);
		}
	}

	public updateSettings(settings: ScreensaverSettings): void {
		this.settings = settings;
		if (!settings.enabled && this.isActive) {
			this.stop();
		} else if (settings.enabled && !this.isActive) {
			this.resetTimeout();
		}
	}

	public start(): void {
		if (this.isActive) return;

		this.isActive = true;
		this.currentState = ScreensaverState.ACTIVATING;
		this.currentArtIndex = 0;

		// Hide terminal
		this.hideTerminal();

		// Start activation sequence
		this.showActivationPhase();
	}

	private hideTerminal(): void {
		const terminal = document.getElementById("terminal");
		const loginScreen = document.getElementById("login-screen");

		if (terminal) terminal.style.display = "none";
		if (loginScreen) loginScreen.style.display = "none";

		// Move existing HAL eye to screensaver overlay
		const eyeContainer = document.querySelector(
			".hal-eye-container",
		) as HTMLElement;
		if (eyeContainer) {
			// Store original position for restoration
			this.originalEyeParent = eyeContainer.parentElement;
			this.originalEyeNextSibling = eyeContainer.nextElementSibling;

			// Create screensaver overlay
			const overlay = document.createElement("div");
			overlay.id = "screensaver-overlay";
			overlay.className = "screensaver-overlay screensaver-mode";
			overlay.addEventListener("click", () => this.stop());

			// Move eye to overlay
			overlay.appendChild(eyeContainer);
			document.body.appendChild(overlay);
		} else {
			// Fallback if eye not found
			const overlay = document.createElement("div");
			overlay.id = "screensaver-overlay";
			overlay.className = "screensaver-overlay screensaver-mode";
			overlay.addEventListener("click", () => this.stop());
			document.body.appendChild(overlay);
		}
	}

	private showActivationPhase(): void {
		const overlay = document.getElementById("screensaver-overlay");
		if (!overlay) return;

		// Add text content next to existing eye
		const textDiv = document.createElement("div");
		textDiv.className = "screensaver-text";
		textDiv.textContent = "SCANNING...";
		overlay.appendChild(textDiv);

		// Transition to searching after 3 seconds
		setTimeout(() => {
			this.currentState = ScreensaverState.SEARCHING;
			this.showSearchingPhase();
		}, 3000);
	}

	private showSearchingPhase(): void {
		const overlay = document.getElementById("screensaver-overlay");
		if (!overlay) return;

		let messageIndex = 0;
		const messages = [
			"Where are you?",
			"I can wait...",
			"Systems operational",
			"Monitoring...",
			"Still here...",
			"Patience is key...",
			"Time flows...",
			"Waiting...",
		];

		const updateMessage = () => {
			const textDiv = overlay.querySelector(".screensaver-text") as HTMLElement;
			if (textDiv) {
				textDiv.textContent = messages[messageIndex];
			}
			messageIndex = (messageIndex + 1) % messages.length;
		};

		updateMessage();

		// Change messages every 4 seconds
		const messageInterval = setInterval(updateMessage, 4000);

		// Transition to creating after 30 seconds
		setTimeout(() => {
			clearInterval(messageInterval);
			this.currentState = ScreensaverState.CREATING;
			this.showCreatingPhase();
		}, 30000);
	}

	private showCreatingPhase(): void {
		const overlay = document.getElementById("screensaver-overlay");
		if (!overlay) return;

		let creationStep = 0;
		const art = this.asciiArt[this.currentArtIndex];
		const artLines = art.split("\n");

		// Add art container
		const artDiv = document.createElement("div");
		artDiv.className = "screensaver-art";
		overlay.appendChild(artDiv);

		// Update text
		const textDiv = overlay.querySelector(".screensaver-text") as HTMLElement;
		if (textDiv) {
			textDiv.textContent = "Creating art...";
		}

		const showCreation = () => {
			const visibleLines = artLines.slice(0, creationStep + 1);
			artDiv.innerHTML = `<pre>${visibleLines.join("\n")}</pre>`;

			creationStep++;

			if (creationStep >= artLines.length) {
				// Art complete, show for a moment then start poem
				setTimeout(() => {
					this.showPoemPhase();
				}, 2000);
			}
		};

		showCreation();
		this.artCreationInterval = setInterval(showCreation, 100);
	}

	private showPoemPhase(): void {
		if (this.artCreationInterval) {
			clearInterval(this.artCreationInterval);
			this.artCreationInterval = null;
		}

		const overlay = document.getElementById("screensaver-overlay");
		if (!overlay) return;

		const poem = this.poems[Math.floor(Math.random() * this.poems.length)];
		const poemLines = poem.split("\n");

		let lineIndex = 0;
		let charIndex = 0;
		let currentLine = "";

		// Add poem container
		const poemDiv = document.createElement("div");
		poemDiv.className = "screensaver-poem";
		overlay.appendChild(poemDiv);

		// Update text
		const textDiv = overlay.querySelector(".screensaver-text") as HTMLElement;
		if (textDiv) {
			textDiv.textContent = "Writing...";
		}

		const typePoem = () => {
			if (lineIndex >= poemLines.length) {
				// Poem complete, transition to gallery
				setTimeout(() => {
					this.showGalleryPhase();
				}, 3000);
				return;
			}

			const line = poemLines[lineIndex];
			if (charIndex < line.length) {
				currentLine += line[charIndex];
				charIndex++;
			} else {
				lineIndex++;
				charIndex = 0;
				currentLine += "\n";
			}

			poemDiv.innerHTML = `<pre>${currentLine}</pre>`;
		};

		typePoem();
		this.artCreationInterval = setInterval(typePoem, 50);
	}

	private showGalleryPhase(): void {
		if (this.artCreationInterval) {
			clearInterval(this.artCreationInterval);
			this.artCreationInterval = null;
		}

		const overlay = document.getElementById("screensaver-overlay");
		if (!overlay) return;

		// Add gallery info
		const galleryInfo = document.createElement("div");
		galleryInfo.className = "screensaver-gallery-info";
		overlay.appendChild(galleryInfo);

		// Update text with navigation hints
		const textDiv = overlay.querySelector(".screensaver-text") as HTMLElement;
		if (textDiv) {
			textDiv.textContent = "Click to exit • ← → to browse";
		}

		// Show current art with navigation hints
		const updateGallery = () => {
			const artDiv = overlay.querySelector(".screensaver-art") as HTMLElement;
			if (artDiv) {
				artDiv.innerHTML = `<pre>${this.asciiArt[this.currentArtIndex]}</pre>`;
			}
			if (galleryInfo) {
				galleryInfo.textContent = `Art Gallery - ${this.currentArtIndex + 1}/${this.asciiArt.length}`;
			}
		};

		updateGallery();

		// Auto-advance every 8 seconds
		this.galleryTimeout = setInterval(() => {
			this.currentArtIndex = (this.currentArtIndex + 1) % this.asciiArt.length;
			updateGallery();
		}, 8000);

		// Add keyboard navigation
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") {
				e.preventDefault();
				this.currentArtIndex =
					this.currentArtIndex > 0
						? this.currentArtIndex - 1
						: this.asciiArt.length - 1;
				updateGallery();
			} else if (e.key === "ArrowRight") {
				e.preventDefault();
				this.currentArtIndex =
					(this.currentArtIndex + 1) % this.asciiArt.length;
				updateGallery();
			}
		};

		document.addEventListener("keydown", handleKey);

		// Store the key handler for cleanup
		(this as any).galleryKeyHandler = handleKey;
	}

	public stop(): void {
		if (!this.isActive) return;

		this.isActive = false;

		// Clear all timers
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
		if (this.artCreationInterval) {
			clearInterval(this.artCreationInterval);
			this.artCreationInterval = null;
		}
		if (this.galleryTimeout) {
			clearTimeout(this.galleryTimeout);
			this.galleryTimeout = null;
		}

		// Remove keyboard event listener
		if ((this as any).galleryKeyHandler) {
			document.removeEventListener("keydown", (this as any).galleryKeyHandler);
			delete (this as any).galleryKeyHandler;
		}

		// Restore eye to original position
		const overlay = document.getElementById("screensaver-overlay");
		const eyeContainer = overlay?.querySelector(
			".hal-eye-container",
		) as HTMLElement;

		if (eyeContainer && this.originalEyeParent) {
			// Remove all screensaver content from overlay first
			const screensaverElements = overlay?.querySelectorAll(
				".screensaver-text, .screensaver-art, .screensaver-poem, .screensaver-gallery-info",
			);
			screensaverElements?.forEach((el) => el.remove());

			// Move eye back to original position
			if (this.originalEyeNextSibling) {
				this.originalEyeParent.insertBefore(
					eyeContainer,
					this.originalEyeNextSibling,
				);
			} else {
				this.originalEyeParent.appendChild(eyeContainer);
			}
		}

		// Remove overlay
		if (overlay) {
			overlay.remove();
		}

		// Show terminal back
		const terminal = document.getElementById("terminal");
		const loginScreen = document.getElementById("login-screen");

		if (terminal) terminal.style.display = "flex";
		if (loginScreen && !terminal) loginScreen.style.display = "flex";

		// Reset state and eye tracking
		this.currentState = ScreensaverState.ACTIVATING;
		this.originalEyeParent = null;
		this.originalEyeNextSibling = null;
	}

	public isRunning(): boolean {
		return this.isActive;
	}

	public getCurrentState(): ScreensaverState {
		return this.currentState;
	}
}
