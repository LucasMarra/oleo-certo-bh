# Óleo Certo BH

Site para localizar pontos de entrega de óleo de cozinha usado no município de Belo Horizonte. Projeto acadêmico da Usina de Projetos Experimentais UPX TI 7, relacionado ao ODS 6, meta 6.3.

## Funcionalidades

- Busca por rua ou avenida e número, consultando a base oficial de endereços da PBH.
- Mapa interativo e lista com pontos ordenados por distância aproximada em linha reta.
- Acesso ao trajeto no Google Maps e à fonte de cada ponto.
- Orientações para resfriamento, armazenamento e entrega do óleo usado.
- Mensagens para endereço inválido, endereço não localizado, falha de consulta e ausência de pontos cadastrados em um raio de 5 km.
- Interface responsiva, controles de teclado e avisos acessíveis.

## Executar localmente

Requer Node.js 22 ou superior.

```sh
npm ci
npm start
```

Abra `http://localhost:3000`. A variável `PORT` pode definir outra porta.

```sh
npm test
npm run check
```

## Dados e limites

A primeira base contém 32 pontos publicados no diretório de ecopontos da Óleo Verde, consultado em 7 de outubro de 2026. Os endereços foram georreferenciados pela API Geocoder da Prefeitura de Belo Horizonte e convertidos de SIRGAS 2000 / UTM 23S (EPSG:31983) para latitude e longitude (EPSG:4326).

Das 38 entradas selecionadas em Belo Horizonte, seis não tiveram correspondência inequívoca de número e rua na base municipal e ficaram fora do mapa. Elas constam em `data/geocoding-pending.json` para revisão. Isso evita publicar coordenadas estimadas como se fossem exatas.

- Fontes e coordenadas estão em `data/points.json`.
- Endereços originais estão em `data/points-source.json`.
- O script `npm run data:geocode` reaproveita as coordenadas já obtidas e espaça as novas consultas.
- Horários e condições não publicados não são inventados; o site orienta a confirmação com o estabelecimento.
- Distância em linha reta não equivale ao percurso rodoviário ou a pé. O trajeto é calculado pelo serviço externo de mapas.
- A base não é um cadastro completo de todos os pontos da cidade. A existência na fonte pública não comprova operação no dia da visita.
- O site não recolhe óleo nem comprova litros reciclados, redução de poluição ou impacto ambiental realizado.

## Serviços e privacidade

O servidor atende os arquivos públicos e consulta a API de endereços da PBH. Não há cadastro de usuários, banco de dados de endereços de visitantes nem analytics. Para reduzir consultas repetidas, respostas de geocodificação são mantidas por até uma hora em memória, com limite de 300 entradas. Os endereços não são registrados nos logs da aplicação. A consulta é encaminhada à PBH; o mapa carrega tiles públicos do OpenStreetMap. Ao abrir um trajeto, as coordenadas são encaminhadas ao Google Maps.

A aplicação limita e espaça as consultas externas. O endereço do geocodificador pode ser configurado por `GEOCODER_URL`. Essa variável deve indicar uma API com formato de resposta compatível com a PBH.

## Publicação no Railway

O `Dockerfile` instala apenas as dependências necessárias. `railway.json` define o início do serviço e a verificação de saúde em `/health`. Não são necessárias chaves de API para a operação do site; o token do Railway serve somente à publicação e não integra o código ou a imagem.

## Fontes

- Óleo Verde. Ecopontos: https://www.oleoverderesiduos.com.br/ecopontos/
- Prefeitura de Belo Horizonte. Geocoder: https://geocoder.pbh.gov.br/geocoder/
- Prefeitura de Belo Horizonte. Feiras de inclusão produtiva e Feira da Afonso Pena: https://prefeitura.pbh.gov.br/politica-urbana/feiras
- TJSC. Descarte de óleo de cozinha: https://www.tjsc.jus.br/web/gestao-socioambiental/descarte-de-oleo-de-cozinha
- Óleo Verde. Onde descartar óleo de cozinha usado em BH: https://www.oleoverderesiduos.com.br/2026/04/29/onde-descartar-oleo-de-cozinha-usado-em-bh-coleta-pontos-e-como-fazer-corretamente/
- Leaflet: https://leafletjs.com/
- OpenStreetMap: https://www.openstreetmap.org/copyright

As bibliotecas e os dados cartográficos permanecem sujeitos às licenças de seus respectivos titulares.
