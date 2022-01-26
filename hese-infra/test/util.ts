

/**
 * Convert       "S3Key": "c13434f8f1aa2ea30fa577b2feb208a41368b11787b752e10bfc71fe8eb919d5.zip",
 * to            "S3Key": "[HASH REMOVED].zip",
 */
export const snapshotSerializer = {
  test: (val: any) => typeof val === 'string',
  print: (val: any) => {
    const newVal = String(val).replace(/([A-Fa-f0-9]{64}).zip/g, '[HASH REMOVED].zip');
    const newVal2 = newVal.replace(/([A-Fa-f0-9]{64}):([0-9]{12}-eu-central-1)/g, '[HASH REMOVED]:$2');
    return `"${newVal2}"`;
  },
};
