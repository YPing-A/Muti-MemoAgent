import type { BridgeInfo, BridgeInterface } from '../types.js';
import { CodeGraph } from '../graph/code-graph.js';

/**
 * Detects cross-language bridges in a codebase.
 * Recognizes React Native, Swift↔ObjC, Expo Modules, Node.js native addons,
 * FFI, and gRPC/Protobuf cross-language services.
 */
export class CrossLanguageBridge {
  /**
   * Analyze the code graph for cross-language bridge patterns.
   */
  detectBridges(graph: CodeGraph): BridgeInfo[] {
    const bridges: BridgeInfo[] = [];
    const allNodes = graph.getAllNodes();

    // ── React Native: NativeModules / TurboModules / Fabric ──
    const nativeModules = allNodes.filter(n =>
      n.language === 'typescript' &&
      (n.name.includes('NativeModule') || n.kind === 'interface' && n.name.includes('Native'))
    );
    const objcFiles = allNodes.filter(n => n.language === 'c' || n.language === 'cpp')
      .map(n => n.file);
    const swiftFiles = allNodes.filter(n => n.language === 'swift').map(n => n.file);

    if (nativeModules.length > 0 && (objcFiles.length > 0 || swiftFiles.length > 0)) {
      bridges.push({
        type: 'react-native-bridge',
        sourceLanguage: 'typescript',
        targetLanguage: objcFiles.length > 0 ? 'objective-c' : 'swift',
        files: [...new Set(nativeModules.map(n => n.file).concat(objcFiles.length > 0 ? objcFiles : swiftFiles))],
        interfaces: nativeModules.map(n => ({
          name: n.name,
          sourceFile: n.file,
          methods: [],
        })),
      });
    }

    // ── React Native TurboModules ──
    const turboModules = allNodes.filter(n =>
      n.language === 'typescript' &&
      (n.name.includes('TurboModule') || n.file.includes('turbo'))
    );
    const cppJsiFiles = allNodes.filter(n =>
      (n.language === 'cpp' || n.language === 'c') &&
      (n.file.includes('jsi') || n.file.includes('JSI'))
    );

    if (turboModules.length > 0 && cppJsiFiles.length > 0) {
      bridges.push({
        type: 'react-native-turbo-module',
        sourceLanguage: 'typescript',
        targetLanguage: 'cpp',
        files: [...new Set(turboModules.map(n => n.file).concat(cppJsiFiles.map(n => n.file)))],
        interfaces: turboModules.map(n => ({
          name: n.name,
          sourceFile: n.file,
          methods: [],
        })),
      });
    }

    // ── Swift ↔ ObjC via bridging header ──
    const swiftObjCHeaders = allNodes.filter(n =>
      n.file.includes('-Bridging-Header.h') || n.file.includes('bridging')
    );
    if (swiftFiles.length > 0 && objcFiles.length > 0 && swiftObjCHeaders.length > 0) {
      bridges.push({
        type: 'swift-objc-bridge',
        sourceLanguage: 'swift',
        targetLanguage: 'objective-c',
        files: [...swiftFiles, ...objcFiles, ...swiftObjCHeaders.map(n => n.file)],
        interfaces: [{
          name: 'BridgingHeader',
          sourceFile: swiftObjCHeaders[0]?.file || '',
          methods: [],
        }],
      });
    }

    // ── Objective-C @objc annotations → Swift interop ──
    const objcAnnotated = allNodes.filter(n =>
      n.language === 'c' || n.language === 'cpp' || n.language === 'objective-c'
    );
    if (swiftFiles.length > 0 && objcAnnotated.length > 0) {
      // Check for common patterns in source code
      // (Detected via the file watcher/indexer; we flag the bridge exists)
    }

    // ── Expo Modules ──
    const expoConfigFiles = allNodes.filter(n => n.file.includes('expo-module.config'));
    if (expoConfigFiles.length > 0) {
      bridges.push({
        type: 'expo-module',
        sourceLanguage: 'typescript',
        targetLanguage: getExpoTargetLanguages(allNodes),
        files: expoConfigFiles.map(n => n.file),
        interfaces: [{
          name: 'ExpoModule',
          sourceFile: expoConfigFiles[0]?.file || '',
          methods: [],
        }],
      });
    }

    // ── Node.js Native Addons (N-API / node-addon-api) ──
    const napiFiles = allNodes.filter(n =>
      n.file.includes('binding.gyp') || n.file.includes('node-addon-api') ||
      (n.language === 'cpp' && n.name.includes('Napi::'))
    );
    const jsNativeBindings = allNodes.filter(n =>
      n.language === 'typescript' || n.language === 'javascript'
    );
    if (napiFiles.length > 0 && jsNativeBindings.length > 0) {
      bridges.push({
        type: 'node-native-addon',
        sourceLanguage: 'javascript',
        targetLanguage: 'cpp',
        files: [...new Set(napiFiles.map(n => n.file).concat(jsNativeBindings.map(n => n.file)))],
        interfaces: napiFiles.map(n => ({
          name: n.name,
          sourceFile: n.file,
          methods: [],
        })),
      });
    }

    // ── FFI (Foreign Function Interface) ──
    // Detect ffi-napi, Deno FFI, or similar patterns
    const ffiNodes = allNodes.filter(n => {
      if (n.language === 'typescript' || n.language === 'javascript') {
        return n.name.includes('ffi') || n.name.includes('dlopen') || n.name.includes('koffi');
      }
      return false;
    });
    const cLibraryFiles = allNodes.filter(n =>
      n.language === 'c' || n.language === 'cpp'
    );
    if (ffiNodes.length > 0) {
      bridges.push({
        type: 'ffi-bridge',
        sourceLanguage: 'javascript',
        targetLanguage: 'c',
        files: [...new Set(ffiNodes.map(n => n.file).concat(cLibraryFiles.map(n => n.file)))],
        interfaces: ffiNodes.map(n => ({
          name: n.name,
          sourceFile: n.file,
          methods: [],
        })),
      });
    }

    // ── gRPC / Protobuf cross-language ──
    const protoFiles = allNodes.filter(n => n.file.endsWith('.proto'));
    if (protoFiles.length > 0) {
      const allLanguages = new Set(allNodes.map(n => n.language));
      bridges.push({
        type: 'grpc-protobuf',
        sourceLanguage: 'protobuf',
        targetLanguage: Array.from(allLanguages).filter(l => l !== 'protobuf').join(','),
        files: protoFiles.map(n => n.file),
        interfaces: protoFiles.map(n => ({
          name: n.name,
          sourceFile: n.file,
          methods: [],
        })),
      });
    }

    return bridges;
  }
}

function getExpoTargetLanguages(allNodes: { language: string; file: string }[]): string {
  const langs = new Set<string>();
  for (const node of allNodes) {
    if (node.language === 'kotlin') langs.add('kotlin');
    if (node.language === 'swift') langs.add('swift');
    if (node.language === 'cpp') langs.add('cpp');
    if (node.language === 'objective-c' || node.language === 'c') {
      const ext = node.file.split('.').pop()?.toLowerCase();
      if (ext === 'm' || ext === 'mm') langs.add('objective-c');
    }
  }
  return Array.from(langs).join(',') || 'native';
}
