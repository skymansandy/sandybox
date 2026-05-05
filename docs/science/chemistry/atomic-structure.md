# Atomic Structure

Everything is made of **atoms** — the smallest unit of an element that retains its chemical identity. Atoms consist of a dense, positively charged nucleus surrounded by a cloud of negatively charged electrons.

---

## Subatomic Particles

| Particle | Charge | Mass (amu) | Location |
|----------|--------|-----------|----------|
| **Proton** (p⁺) | +1 | ~1.0073 | Nucleus |
| **Neutron** (n⁰) | 0 | ~1.0087 | Nucleus |
| **Electron** (e⁻) | −1 | ~0.00055 | Electron cloud |

- **Atomic number (Z)** = number of protons → defines the element
- **Mass number (A)** = protons + neutrons
- **Isotopes** = same element, different number of neutrons (e.g., ¹²C vs ¹⁴C)

!!! note "Scale"
    If an atom were the size of a football stadium, the nucleus would be a marble at center field. The atom is ~99.9999999999996% empty space. Yet the nucleus contains ~99.95% of the atom's mass.

---

## Evolution of Atomic Models

| Model | Year | Key Idea | Limitation |
|-------|------|----------|------------|
| **Dalton** | 1803 | Indivisible solid spheres | No internal structure |
| **Thomson** | 1897 | "Plum pudding" — electrons embedded in positive charge | No nucleus |
| **Rutherford** | 1911 | Dense positive nucleus with electrons orbiting | Electrons should spiral inward (classical physics) |
| **Bohr** | 1913 | Electrons in fixed energy levels (orbits) | Only works for hydrogen; no wave behavior |
| **Quantum mechanical** | 1926+ | Electrons as probability clouds (orbitals) | Current accepted model |

```mermaid
graph LR
    D["Dalton<br/>Solid sphere"] --> T["Thomson<br/>Plum pudding"]
    T --> R["Rutherford<br/>Nuclear model"]
    R --> B["Bohr<br/>Quantized orbits"]
    B --> QM["Quantum Model<br/>Orbitals"]

    style QM fill:#2ecc71,color:#fff
```

---

## Quantum Numbers

Each electron in an atom is described by four quantum numbers:

| Quantum Number | Symbol | Values | Describes |
|---------------|--------|--------|-----------|
| **Principal** | n | 1, 2, 3, ... | Energy level (shell); larger n = farther from nucleus |
| **Angular momentum** | l | 0 to n−1 | Orbital shape: 0=s, 1=p, 2=d, 3=f |
| **Magnetic** | mₗ | −l to +l | Orbital orientation in space |
| **Spin** | mₛ | +½ or −½ | Electron spin direction |

### Orbital Shapes

| Orbital | l value | Shape | Max electrons |
|---------|---------|-------|--------------|
| **s** | 0 | Sphere | 2 |
| **p** | 1 | Dumbbell (3 orientations) | 6 |
| **d** | 2 | Cloverleaf (5 orientations) | 10 |
| **f** | 3 | Complex (7 orientations) | 14 |

---

## Electron Configuration

The arrangement of electrons in an atom's orbitals, governed by three rules:

| Rule | Statement | Example |
|------|-----------|---------|
| **Aufbau principle** | Fill lower-energy orbitals first | 1s → 2s → 2p → 3s → 3p → 4s → 3d |
| **Pauli exclusion principle** | Max 2 electrons per orbital, with opposite spins | ↑↓ in one orbital |
| **Hund's rule** | Fill all orbitals of equal energy singly first, then pair | p³ = ↑ ↑ ↑ (not ↑↓ ↑ _) |

### Filling Order

```mermaid
graph TD
    A["1s"] --> B["2s"]
    B --> C["2p"]
    C --> D["3s"]
    D --> E["3p"]
    E --> F["4s"]
    F --> G["3d"]
    G --> H["4p"]
    H --> I["5s"]
    I --> J["4d"]
    J --> K["5p"]
    K --> L["6s"]
    L --> M["4f"]
    M --> N["5d"]
```

### Examples

| Element | Z | Configuration | Shorthand |
|---------|---|--------------|-----------|
| Hydrogen | 1 | 1s¹ | 1s¹ |
| Carbon | 6 | 1s² 2s² 2p² | [He] 2s² 2p² |
| Sodium | 11 | 1s² 2s² 2p⁶ 3s¹ | [Ne] 3s¹ |
| Iron | 26 | 1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d⁶ | [Ar] 4s² 3d⁶ |
| Copper | 29 | 1s² 2s² 2p⁶ 3s² 3p⁶ 4s¹ 3d¹⁰ | [Ar] 4s¹ 3d¹⁰ |

!!! warning "Exceptions to Aufbau"
    Chromium (Cr) and Copper (Cu) are common exceptions. Half-filled and fully-filled d subshells are extra stable, so Cr is [Ar] 4s¹ 3d⁵ (not 4s² 3d⁴) and Cu is [Ar] 4s¹ 3d¹⁰ (not 4s² 3d⁹).

---

## Ions and Isoelectronic Species

- **Cation** = atom that lost electrons (positive charge): Na → Na⁺ + e⁻
- **Anion** = atom that gained electrons (negative charge): Cl + e⁻ → Cl⁻
- **Isoelectronic** = different species with the same electron configuration: Na⁺, Ne, F⁻ all have 10 electrons (1s² 2s² 2p⁶)

| Species | Protons | Electrons | Configuration |
|---------|---------|-----------|---------------|
| F⁻ | 9 | 10 | 1s² 2s² 2p⁶ |
| Ne | 10 | 10 | 1s² 2s² 2p⁶ |
| Na⁺ | 11 | 10 | 1s² 2s² 2p⁶ |
| Mg²⁺ | 12 | 10 | 1s² 2s² 2p⁶ |

!!! note "Ionic radius trend"
    Among isoelectronic species, more protons means a smaller radius — the extra nuclear charge pulls the same electron cloud tighter. So Mg²⁺ < Na⁺ < Ne < F⁻.

---

## Radioactivity and Isotopes

Unstable isotopes undergo **radioactive decay** to reach a more stable configuration.

| Decay Type | Emission | Change | Example |
|-----------|----------|--------|---------|
| **Alpha (α)** | ⁴He nucleus (2p + 2n) | Z−2, A−4 | ²³⁸U → ²³⁴Th + ⁴He |
| **Beta (β⁻)** | Electron + antineutrino | Z+1, A same | ¹⁴C → ¹⁴N + e⁻ + ν̄ |
| **Gamma (γ)** | High-energy photon | No change in Z or A | Excited nucleus → ground state |
| **Positron (β⁺)** | Positron + neutrino | Z−1, A same | ²²Na → ²²Ne + e⁺ + ν |

**Half-life** = time for half the radioactive atoms to decay. Ranges from fractions of a second (e.g., ²¹⁵At: 0.1 ms) to billions of years (e.g., ²³⁸U: 4.5 billion years).

---

??? question "Interview Questions"

    **Q: What determines what element an atom is?**
    The number of protons (atomic number, Z). Change the protons and you change the element. Neutrons can vary (isotopes), and electrons can be gained or lost (ions), but the proton count defines chemical identity.

    **Q: What is the difference between an orbit and an orbital?**
    A Bohr orbit is a fixed circular path with a definite radius. A quantum orbital is a probability distribution — a 3D region where there's a ~90% chance of finding an electron. Orbitals have specific shapes (s = sphere, p = dumbbell, d = cloverleaf) and are described by quantum numbers.

    **Q: Why do elements in the same group have similar properties?**
    They have the same number of valence electrons (outer shell electrons). Chemical behavior is determined primarily by valence electrons — their number, arrangement, and energy. For example, all alkali metals (Group 1) have one valence electron, making them all highly reactive metals that form +1 ions.

    **Q: Why is a half-filled d subshell particularly stable?**
    Half-filled (d⁵) and fully-filled (d¹⁰) subshells have extra stability due to exchange energy — a quantum mechanical effect where electrons with parallel spins in degenerate orbitals stabilize each other. This is why Cr is [Ar] 4s¹ 3d⁵ instead of [Ar] 4s² 3d⁴.

    **Q: What is the Heisenberg uncertainty principle and how does it relate to atomic structure?**
    You cannot simultaneously know an electron's exact position and momentum. This is why electrons don't have fixed orbits — we can only describe probability distributions (orbitals). The more precisely you know where an electron is, the less precisely you know its momentum, and vice versa.

!!! tip "Further Reading"
    - [Hyperphysics — Quantum Physics](http://hyperphysics.phy-astr.gsu.edu/hbase/quantum/quantcon.html) — interactive physics concepts
    - [NIST Atomic Spectra Database](https://www.nist.gov/pml/atomic-spectra-database) — authoritative spectral data
