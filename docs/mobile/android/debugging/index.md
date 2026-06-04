# Android Debugging

Debugging Android apps involves multiple layers — from the bridge that connects your workstation to the device, to the wire protocol that lets your IDE set breakpoints inside a running VM. Understanding these layers explains why "Attach Debugger" sometimes hangs while "Debug" just works.

## Topics

| Topic | What It Covers |
|-------|---------------|
| [**ADB — Android Debug Bridge**](adb.md) | Client-server architecture, USB/Wi-Fi modes, daemon lifecycle, essential commands |
| [**Debugger Internals**](debugger-internals.md) | JDWP protocol, how breakpoints work at the VM level, Debug launch vs Attach to Process, and why attaching sometimes gets stuck |

**Recommended reading order:** ADB first (it's the transport layer), then Debugger Internals (the protocol and IDE behavior that ride on top of it).
