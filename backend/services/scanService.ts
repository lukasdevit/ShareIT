import NodeClam from 'clamscan';

let scanner: NodeClam | null = null;

export async function initScanner(): Promise<NodeClam | null> {
  try {
    scanner = await new NodeClam().init({
      clamdscan: {
        socket: '/var/run/clamav/clamd.ctl', // or use host/port
      },
      preference: 'clamdscan',
    });
    console.warn('ClamAV scanner initialized');
    return scanner;
  } catch (err) {
    console.warn(
      'ClamAV not available, skipping virus scans:',
      (err as Error).message
    );
    return null;
  }
}

export async function scanFile(
  filepath: string
): Promise<{ clean: boolean; viruses: string[] }> {
  if (!scanner) {
    console.warn('Scanner not initialized, skipping scan for:', filepath);
    return { clean: true, viruses: [] };
  }

  const result = await scanner.scanFile(filepath);
  return {
    clean: !result.isInfected,
    viruses: result.viruses ?? [],
  };
}
