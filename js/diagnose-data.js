/* ==========================================================
   DIAGNOSE — question flows
   Every flow is plain data so it can be read and reviewed
   without touching the engine (js/diagnose.js).

   A step is either a question:
     { q: "...", help: "...", options: [ { label, next } ] }
   or a result:
     { result: true, level, confidence, title, why, checks, help, links }

   level:      "danger" | "stop" | "check"
   confidence: "Likely" | "Possible" | "Needs a mechanic"

   Rules (tests/run.js enforces them):
   - every flow starts with the battery-danger question
   - every "next" points at a step that exists
   - nothing here names a manufacturer error code; those live in
     the error-code library with a source for each one
   ========================================================== */
const DIAGNOSE = {
  reviewed: "Pending review by Bikes Plus",
  start: {
    q: "What's happening with your e-bike?",
    options: [
      { label: "It won't turn on, or the display is blank", flow: "no-power" },
      { label: "It turns on, but the motor won't help", flow: "no-assist" },
      { label: "The battery won't charge", flow: "no-charge" },
      { label: "There's an error code or warning on the display", flow: "error-code" },
      { label: "Something else", flow: "other" }
    ]
  },

  /* shared first steps, used by every flow */
  shared: {
    "battery-check": {
      q: "First, a safety check. Is the battery hot, swollen, leaking, smoking, or does it smell strange?",
      help: "Look at it and use your nose. Don't pick it up if it's hot.",
      options: [
        { label: "Yes", next: "battery-danger" },
        { label: "No", next: "@flow" }
      ]
    },
    "battery-danger": {
      result: true, level: "danger", confidence: "Likely",
      title: "Treat the battery as dangerous",
      why: "Heat, swelling, leaks, smoke or a strange smell are warning signs that a lithium-ion battery is failing.",
      checks: [
        "If there is smoke, flames, hissing or popping: get everyone away, close the door behind you and call 911.",
        "If not: stop charging (switch off at the wall only if you don't have to touch the battery) and don't ride it.",
        "Keep it away from anything that can burn and away from your way out.",
        "Don't throw it away or ship it."
      ],
      help: "Call us before doing anything else with it.",
      links: [{ label: "Read the battery safety page", href: "battery-safety.html" }],
      call911: true
    }
  },

  flows: {

    /* ---------- won't turn on ---------- */
    "no-power": {
      title: "Won't turn on",
      first: "np-charge",
      steps: {
        "np-charge": {
          q: "Does the battery show any charge?",
          help: "Most batteries have a button or lights on the battery itself that show the charge level.",
          options: [
            { label: "Yes, it shows some charge", next: "np-seated" },
            { label: "No lights, or it shows empty", next: "np-charge-it" },
            { label: "I can't tell", next: "np-seated" }
          ]
        },
        "np-charge-it": {
          result: true, level: "check", confidence: "Likely",
          title: "Start by charging the battery",
          why: "An empty battery is the most common reason an e-bike won't turn on. Some batteries also shut themselves off when they get very low, to protect the cells.",
          checks: [
            "Charge it fully with the charger that came with it, plugged straight into a wall outlet.",
            "Stay nearby while it charges.",
            "When it's full, put it back on the bike and try again."
          ],
          help: "If it still won't charge, go back and choose \"The battery won't charge\".",
          links: [{ label: "Battery won't charge", flow: "no-charge" }]
        },
        "np-seated": {
          q: "Is the battery clicked all the way into its mount?",
          help: "If your battery locks with a key, check the key is in the riding position.",
          options: [
            { label: "Yes, it's fully in", next: "np-damage" },
            { label: "No, or I'm not sure", next: "np-reseat" }
          ]
        },
        "np-reseat": {
          result: true, level: "check", confidence: "Likely",
          title: "Re-seat the battery",
          why: "A battery that isn't fully in its mount can't connect to the bike, even if it's charged.",
          checks: [
            "Switch the bike off.",
            "Take the battery out, check the contacts are clean and dry (look, don't poke them), then slide it back in until it clicks.",
            "Check the key position if your battery has a lock.",
            "Switch on again."
          ],
          help: "If it still won't turn on, start again and answer \"Yes, it's fully in\"."
        },
        "np-damage": {
          q: "Can you see any damage to the cables or plugs near the display, the battery mount or the motor?",
          help: "Just look. Don't pull or bend cables to check.",
          options: [
            { label: "Yes, something looks damaged or unplugged", next: "np-damaged" },
            { label: "No, everything looks fine", next: "np-mechanic" }
          ]
        },
        "np-damaged": {
          result: true, level: "stop", confidence: "Likely",
          title: "Don't ride it until it's repaired",
          why: "A damaged or loose cable can stop the system from powering on, and damaged wiring can short.",
          checks: [
            "Switch the bike off and take the battery out.",
            "Don't tape over damaged wires or force plugs back in.",
            "Take a photo of what you found."
          ],
          help: "Bring it in or send us the photo."
        },
        "np-mechanic": {
          result: true, level: "stop", confidence: "Needs a mechanic",
          title: "This needs a mechanic to test it",
          why: "With a charged, properly seated battery and no visible damage, the cause is usually inside the system: the display, the controller, an internal connection, or the battery's own protection. Those need test equipment to tell apart.",
          checks: [
            "Write down exactly what happens when you press the power button.",
            "Note anything that happened just before it stopped, like rain, a drop or a recent repair."
          ],
          help: "Bring it in. We work on any brand."
        }
      }
    },

    /* ---------- turns on, no assist ---------- */
    "no-assist": {
      title: "Turns on, but no assist",
      first: "na-code",
      steps: {
        "na-code": {
          q: "Is there an error code or warning on the display?",
          options: [
            { label: "Yes", next: "na-to-code" },
            { label: "No", next: "na-level" }
          ]
        },
        "na-to-code": {
          result: true, level: "check", confidence: "Possible",
          title: "Start with the error code",
          why: "The code is the bike's own best clue. What it means depends on your motor system.",
          checks: ["Write down the exact code, letters and numbers, before switching anything off."],
          links: [{ label: "Look up my error code", flow: "error-code" }]
        },
        "na-level": {
          q: "Is an assist level selected, and not OFF or 0?",
          options: [
            { label: "Yes", next: "na-brakes" },
            { label: "No, or I'm not sure", next: "na-set-level" }
          ]
        },
        "na-set-level": {
          result: true, level: "check", confidence: "Likely",
          title: "Choose an assist level",
          why: "With assist set to OFF or 0, the motor won't help at all, even though the display is on.",
          checks: [
            "Use the + or up button on the controller to pick the lowest assist level.",
            "Ride a few pedal turns. Most systems only help once you're pedaling."
          ],
          help: "If it still doesn't help, start again and answer \"Yes\"."
        },
        "na-brakes": {
          q: "Are both brake levers springing all the way back when you let go?",
          help: "Many e-bikes cut the motor while a brake lever is pulled, even slightly.",
          options: [
            { label: "Yes, both return fully", next: "na-which" },
            { label: "No, or I'm not sure", next: "na-brake-cutoff" }
          ]
        },
        "na-brake-cutoff": {
          result: true, level: "check", confidence: "Likely",
          title: "A brake lever may be cutting the motor",
          why: "Brake levers on many e-bikes have a switch that turns the motor off while you brake. A lever that doesn't fully return keeps the motor off.",
          checks: [
            "Squeeze and release each brake lever firmly a few times.",
            "Check nothing is pushing on a lever, like a bag strap or a bent mount.",
            "Try the assist again."
          ],
          help: "If a lever stays stuck or the brakes feel different, don't ride it. Brakes come first. Bring it in."
        },
        "na-which": {
          q: "Which part isn't working?",
          options: [
            { label: "Pedal assist doesn't work", next: "na-pas" },
            { label: "The throttle doesn't work", next: "na-throttle" },
            { label: "Neither works", next: "na-both" },
            { label: "My bike has no throttle", next: "na-pas" }
          ]
        },
        "na-pas": {
          result: true, level: "check", confidence: "Possible",
          title: "Pedal assist sensor or speed sensor",
          why: "Pedal assist needs to know you're pedaling and how fast the wheel turns. If either signal is missing, the motor holds back.",
          checks: [
            "If your bike has a small magnet on a rear-wheel spoke, check it's still there and lined up with the sensor on the frame. Don't bend anything.",
            "Switch the bike off and on again.",
            "Check the chain and wheel turn freely."
          ],
          help: "If it still doesn't help, it needs a mechanic to test the sensors."
        },
        "na-throttle": {
          result: true, level: "check", confidence: "Possible",
          title: "Throttle or throttle setting",
          why: "Some bikes only allow the throttle after you start pedaling, or have it switched off in the settings. A damaged throttle or its cable can also stop it.",
          checks: [
            "Check your manual for whether the throttle needs you to pedal first.",
            "Look at the throttle cable for damage. Look only; don't pull it."
          ],
          help: "If the throttle still does nothing, bring it in."
        },
        "na-both": {
          result: true, level: "stop", confidence: "Needs a mechanic",
          title: "This needs a mechanic to test it",
          why: "When the display works but neither pedal assist nor throttle drives the motor, common causes are a motor connection, the controller, or a sensor. They need test equipment to tell apart.",
          checks: [
            "Make sure the battery shows a good charge. A nearly empty battery can turn the display on but not run the motor.",
            "Note when it started and anything that happened just before."
          ],
          help: "Bring it in. You can still pedal it home as a regular bike if the brakes work normally."
        }
      }
    },

    /* ---------- won't charge ---------- */
    "no-charge": {
      title: "Battery won't charge",
      first: "nc-wall",
      steps: {
        "nc-wall": {
          q: "Plugged into the wall but not into the battery, does the charger show a light?",
          options: [
            { label: "Yes, there's a light", next: "nc-light" },
            { label: "No light at all", next: "nc-no-light" }
          ]
        },
        "nc-no-light": {
          result: true, level: "check", confidence: "Possible",
          title: "The charger may not be getting power",
          why: "No light usually means no power reaching the charger, or a charger that has failed.",
          checks: [
            "Try a different wall outlet. Don't use a power strip or extension cord.",
            "Check both ends of the charger's power cord are pushed all the way in.",
            "If there's still no light, the charger may have failed. Replace it only with your bike maker's charger or one they approve, never one just because the plug fits."
          ],
          help: "We can test the charger and battery for you."
        },
        "nc-light": {
          q: "Now connect it to the battery. What does the charger light do?",
          options: [
            { label: "Changes to show it's charging", next: "nc-charging" },
            { label: "Shows full straight away", next: "nc-temp" },
            { label: "Blinks or flashes", next: "nc-blink" },
            { label: "Nothing changes", next: "nc-plug" }
          ]
        },
        "nc-charging": {
          result: true, level: "check", confidence: "Likely",
          title: "It's charging",
          why: "The charger has recognized the battery. A very empty battery can take several hours.",
          checks: [
            "Stay nearby while it charges and unplug it when it's full.",
            "If it never finishes in the time your manual gives, stop charging and have it checked."
          ]
        },
        "nc-temp": {
          q: "Is the battery very hot or very cold right now?",
          help: "For example, it's just been ridden hard, left in a hot car, or stored somewhere cold.",
          options: [
            { label: "Yes", next: "nc-wait" },
            { label: "No, it's at room temperature", next: "nc-protect" }
          ]
        },
        "nc-wait": {
          result: true, level: "check", confidence: "Likely",
          title: "Let it reach room temperature",
          why: "Many batteries won't charge when they're too hot or too cold. That's a safety feature.",
          checks: [
            "Leave it indoors, away from direct sun, until it's at room temperature.",
            "Then try charging again."
          ],
          help: "If it gets hot on its own without being ridden or left in the sun, treat it as dangerous.",
          links: [{ label: "Battery safety", href: "battery-safety.html" }]
        },
        "nc-protect": {
          result: true, level: "stop", confidence: "Needs a mechanic",
          title: "The battery may be protecting itself, or worn out",
          why: "If the charger says full but the bike says empty, the battery's protection may have switched it off, or the battery may be near the end of its life. Only a test can tell.",
          checks: [
            "Don't keep plugging and unplugging it.",
            "Don't open the battery or try another charger."
          ],
          help: "Bring the battery and charger in for a test."
        },
        "nc-blink": {
          result: true, level: "stop", confidence: "Possible",
          title: "The charger is reporting a problem",
          why: "On many chargers a blinking light means a fault with the connection, the temperature or the battery. The exact meaning depends on your charger.",
          checks: [
            "Check your charger's label or manual for what the blink pattern means.",
            "Look at the charging port and plug for dirt, water, bent pins or burn marks. Look only.",
            "Don't keep retrying."
          ],
          help: "If you see any burn marks or melting, stop using it and treat it as dangerous. Otherwise, bring it in.",
          links: [{ label: "Battery safety", href: "battery-safety.html" }]
        },
        "nc-plug": {
          result: true, level: "check", confidence: "Possible",
          title: "Check the connection",
          why: "If nothing changes, the charger may not be connecting to the battery.",
          checks: [
            "Push the plug fully into the battery's charging port.",
            "Check the port is clean and dry. Look, don't poke.",
            "If your battery has its own on/off button, check it's on."
          ],
          help: "If it still doesn't start charging, bring the battery and charger in."
        }
      }
    },

    /* ---------- error code ---------- */
    "error-code": {
      title: "Error code on the display",
      first: "ec-system",
      steps: {
        "ec-system": {
          q: "Which motor system does your bike have?",
          help: "The brand is usually printed on the motor, the display or the battery. It's often different from the bike's brand.",
          options: [
            { label: "Bosch", next: "ec-bosch" },
            { label: "Shimano (STEPS / EP)", next: "ec-shimano" },
            { label: "Bafang", next: "ec-other" },
            { label: "Something else", next: "ec-other" },
            { label: "I don't know", next: "ec-unknown" }
          ]
        },
        "ec-bosch": {
          result: true, level: "check", confidence: "Possible",
          title: "Look up the code on Bosch's site",
          why: "The same number can mean different things on different systems, so only Bosch's own list is reliable for a Bosch bike. We've written up the common Bosch codes in plain English, each checked against Bosch's own pages.",
          checks: [
            "Write down the exact code.",
            "Newer Bosch displays may show a QR code with the error. Scanning it opens Bosch's page for that code.",
            "Switch the system off and on once. If the code comes back, stop and get it checked."
          ],
          links: [
            { label: "Look up a Bosch code", href: "error-codes/bosch.html" },
            { label: "Bosch eBike help center (official)", href: "https://help.bosch-ebike.com/" }
          ]
        },
        "ec-shimano": {
          result: true, level: "check", confidence: "Possible",
          title: "Check Shimano's manual for your system",
          why: "Shimano lists its error and warning codes in the manuals for each system. Codes starting with W are warnings; codes starting with E are errors.",
          checks: [
            "Write down the exact code.",
            "Switch the system off and on once. If the code comes back, stop and get it checked."
          ],
          links: [{ label: "Shimano manuals (official)", href: "https://si.shimano.com/" }]
        },
        "ec-other": {
          result: true, level: "check", confidence: "Possible",
          title: "Check your bike's manual",
          why: "We don't have a verified code list for this system yet, and we won't guess. The same number means different things on different bikes.",
          checks: [
            "Write down the exact code and what you were doing when it appeared.",
            "Look for the error table in your bike's or display's manual.",
            "Switch the system off and on once. If the code comes back, stop and get it checked."
          ],
          help: "Or send us a photo of the display. We can usually tell what it is."
        },
        "ec-unknown": {
          result: true, level: "check", confidence: "Needs a mechanic",
          title: "Send us a photo",
          why: "Error codes only make sense for a specific motor system. A photo of the display and the motor usually tells us which one you have.",
          checks: [
            "Take a photo of the display showing the code.",
            "Take a photo of the motor (at the pedals or in the wheel hub) and any label on it."
          ],
          help: "Email the photos and we'll tell you what it means."
        }
      }
    },

    /* ---------- other ---------- */
    "other": {
      title: "Something else",
      first: "ot-ask",
      steps: {
        "ot-ask": {
          result: true, level: "check", confidence: "Needs a mechanic",
          title: "Tell us what's happening",
          why: "We're starting with the most common problems. For anything else, a mechanic is quicker than a checklist.",
          checks: [
            "If it's anything to do with the brakes or steering, don't ride it until it's checked.",
            "Note when it started, and take a photo or a short video if it makes a noise."
          ],
          help: "Call or email us. A mechanic answers."
        }
      }
    }
  }
};

if (typeof module !== "undefined") module.exports = DIAGNOSE;
