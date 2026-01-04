// data/projects.ts
export type ProjectDef = {
  key: string;
  title: string;
  chain: string;
  contractAddress: string;
  collectionSlug: string;
};


export const PROJECTS: ProjectDef[] = [
  {
    key: "based-ghouls",
    title: "Based Ghouls",
    chain: "ethereum",
    collectionSlug: "based-ghouls",
    contractAddress: "0xef1a89cbfabe59397ffda11fc5df293e9bc5db90", 
  },
   {
    key: "lucky-ghouls",
    title: "Lucky Ghouls",
    chain: "base",
    collectionSlug: "lucky-ghouls",
    contractAddress: "0x86c3262bd79f0d133b553a1c3935a674fcb3145e", 
  },
  {
    key: "ghoul-dust",
    title: "Ghoul Dust",
    chain: "base",
    collectionSlug: "ghoul-dust",
    contractAddress: "0x6cb90c88337207675ac12d1c760471bc29a84f90", 
  },
   {
    key: "vector-ghouls",
    title: "Vector Ghouls",
    chain: "base",
    collectionSlug: "vector-ghouls",
    contractAddress: "0x90b4831783c1442716bf3262d97916d7b0ac59b9", 
  },
   {
    key: "theghouliens",
    title: "The Ghouliens",
    chain: "ethereum",
    collectionSlug: "theghouliens",
    contractAddress: "0x4827e9a91be05d2c4a6cca5c90cd298b5aad8d9c", 
  },
   {
    key: "hyper-ghouls",
    title: "Hyper Ghouls",
    chain: "zora",
    collectionSlug: "hyper-ghouls",
    contractAddress: "0x808bca1944bcb79a5c074d50e6dc59e50a0f3d21", 
  },
  {
    key: "ghoul-casters",
    title: "Ghoul Casters",
    chain: "base",
    collectionSlug: "ghoul-casters",
    contractAddress: "0xa2b07d7db61f0fae8459af2534c02f3dbe932d04", 
  },
  {
    key: "based-glitchghouls",
    title: "Based glitchGhouls",
    chain: "base",
    collectionSlug: "based-glitchghouls",
    contractAddress: "0x1407eb806e9d6d28cc33944a620f6328d8a12ec6", 
  },
];
