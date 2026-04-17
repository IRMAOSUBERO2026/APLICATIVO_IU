-- Atualiza status dos 95 funcionários existentes conforme planilha global de RH
DO $$
DECLARE updates_data text[][] := ARRAY[
  ARRAY['62d40e3d-316a-4268-9067-677168a5f8f7','ativo',NULL,NULL],
  ARRAY['a7eae2fe-cc55-40c3-b975-3d7c3b3724a4','ativo',NULL,NULL],
  ARRAY['d55a9dbd-0842-4397-a105-5fe9e80b0bc5','ativo',NULL,NULL],
  ARRAY['00b3a231-ecb3-48bb-9262-aeddf686ac91','ativo',NULL,NULL]
];
BEGIN END $$;

-- Apenas executa updates diretos (mais simples e auditável):
UPDATE funcionarios SET status = 'ativo', data_rescisao = NULL, motivo_rescisao = NULL WHERE id IN (
  '62d40e3d-316a-4268-9067-677168a5f8f7','a7eae2fe-cc55-40c3-b975-3d7c3b3724a4','d55a9dbd-0842-4397-a105-5fe9e80b0bc5',
  '00b3a231-ecb3-48bb-9262-aeddf686ac91','b5464600-7157-4e83-af60-94d98cee7974','d9505aac-7859-4328-9ab2-0fba601528e0',
  '627512d0-50e0-4010-8b85-85a4c7821050','720336b1-b958-45cc-ae1d-a5ecf9b988e5','69d93883-e8c4-42cf-b4ae-079a7fdbf45f',
  'f8023047-a4cb-47fa-811e-43d0f0365760','396618e7-ac89-48e9-bdc5-0c1628bb7550','140bd7ce-fca8-409b-9ddc-094c23f6eede',
  '4a0c10eb-5a21-47fa-85de-9d071e1e4e32','7e8fd230-a13e-4360-9c36-a04bf8f02c4a','3c45cc94-6624-41d5-ae5b-1e8255388b22',
  '4ccd7f3f-326e-4eed-ac36-a5b5574c541f','4b948117-6085-414d-8842-2b918b1091f6','62409bd8-4622-40c4-bfec-4fb1dd52f2a1',
  '0fdbdc17-6e89-47c8-890a-ec7b3eb2b532','e62ba80a-7a7a-48ae-aca3-9505fed73608','37b0610d-3eab-43a9-b0dc-1b856c2dc1aa',
  '72e3c62b-96c0-416f-91c1-d7d3d8042985','d0f57aa1-acf8-41cf-8239-d019f52ed2a8','ce0f7a5f-4d27-4bc8-809d-0eb2a66fc4e2',
  'ecf4c816-f4f0-49c4-be03-ea324cf0a6fd','9caae8c9-775b-4eb6-a55c-45d188fd9718','e49d272e-0a17-46e3-bfe5-aa54dd128b3f',
  '9abec24c-c033-4277-a4c9-77e4aa2eb77c','d48ebb5b-92dc-4294-a0b6-2ef8d2ad9964','bbd0b94f-f457-454e-aabc-768e00ec679a',
  '754d4b20-d40a-4988-8924-030d9bcd655f','34a7b098-a625-4895-800a-47036b51665b','b55b0da0-0f18-4589-9d4b-682eeff78b0e',
  '550f1246-8ae0-4a2d-8de1-aa42b7171d78','5300a2b0-658e-4817-b7b8-f2db69c70f24','09509a99-72fc-4fd1-8fdd-28fc0a3b940f',
  '8279a6a5-19fd-456a-82b1-dde7b9d4d4c7','469917ed-4697-4d5f-aa8f-ba7d4ee5abc8','967757f2-763d-4433-88b3-5512398522ed',
  '082478c0-f95f-4639-ba26-a5226ab09126','c34b9c54-9207-4858-a149-945a44ad3fe2','d5405a85-de39-4443-8d22-7bd1e575afe3',
  '1efcfe4b-0236-47c2-9e37-47d7972133dd','4f53b4aa-c96f-44e9-90fd-571a58f937fa','29f5f780-78c1-46e9-8e56-822c66dd763c',
  '18292b5c-d7ff-420f-8c67-659cd9e4b88f','6cb34caf-090c-4bde-bec8-954ea5a38467','3732c369-8bcc-45dc-af4c-472f67490479',
  '42e3127c-0aea-49a1-84df-e2d6b776dae8','7fcfc6a7-52ed-4c33-8db3-e4635e7c5544','690ce1c7-55a8-4a3a-ac72-0f283a342d0c',
  '3c152948-8188-42e3-afe2-07afc3da58bf','abec6530-49e6-4aca-a7d6-5da2e091c6f8','a3b5d00c-3730-411c-bb63-c1f8ebce8edd',
  '37ee972a-5fc5-401b-9e4c-3e4117836c0b','f64c9309-8349-43cd-8e6c-53d758ee2ed6','266ccb2d-b660-4a65-b30f-714e5ce3fc51',
  '2af796bb-8159-4279-b0bc-882b0e81f0f0','eba8e47d-3d5e-4aae-a39f-d9ee28af43b2','7f711aca-d9ca-4a59-96e0-f4c5dec45f9f',
  '942517c4-e2d8-4575-8367-dde8780e680d','143d5aea-a422-4226-8da6-2995a3174a7d','f7fbad7f-4051-492f-9250-8ccf6cc29d1a'
);

-- Marca como desligado os 11 que constam apenas como desligados na planilha
UPDATE funcionarios SET status = 'desligado', data_rescisao = '2026-04-10', motivo_rescisao = 'Importação histórica - planilha global RH'
  WHERE id IN ('9adf07f2-90f2-4530-a4b4-eec0d56b9d99','f01ea009-451f-4d5c-b880-1eea71323a9e','1d43a641-0a90-4470-9fef-6ec1cb1803ed','060e990e-fd81-4cf7-869d-7c072955c2ff','15060f7c-1dcc-4676-9927-6dcd10dd46e3');

UPDATE funcionarios SET status = 'desligado', data_rescisao = '2026-04-16', motivo_rescisao = 'Importação histórica - planilha global RH' WHERE id = 'b4cf8e23-9494-4a1b-9ae8-719dfe0ee1b2';
UPDATE funcionarios SET status = 'desligado', data_rescisao = '2026-04-11', motivo_rescisao = 'Importação histórica - planilha global RH' WHERE id = '2547a68b-5549-4f57-affb-16165fb5ad0b';