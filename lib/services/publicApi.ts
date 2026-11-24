import z from 'zod';
import Util from '../Util.ts';
import Semaphore from '../Semaphore.ts';


/* Helper function to call any of the API endpoints */

const WgResponseSchema = z.object({
   status: z.string(),

   // Error is present when status is not "ok"

   error: z.optional(z.object({
      message: z.string()
   })),

   // Meta is present when status is "ok"

   meta: z.optional(z.object({
      page: z.number().optional(),
      page_total: z.number().optional()
   })),

   // Depending on the response, data is either an object or an array of objects.
   // In either case, the value is parsed with another schema.

   data: z.union([z.looseObject({}), z.array(z.unknown())])
});

const callApi = async (url: string, options = {}) => {
   const data = await Util.fetch(url, options);
   const response = WgResponseSchema.parse(data);

   if (response.status !== 'ok')
      throw new Error(`Wargaming API error: ${response?.error?.message}`);

   return response;
};


/* /encyclopedia/info -- Contains current game version */

const EncyclopediaInfoSchema = z.object({
   game_version: z.string()
});

const encyclopediaInfo = async (apiId: string, { debug = false } = {}) => {
   const { data } = await callApi(
      `https://api.worldofwarships.eu/wows/encyclopedia/info/?application_id=${apiId}`,
      { debug }
   );

   return EncyclopediaInfoSchema.parse(data);
};


/* /encyclopedia/ships -- List of ships in the current game version */

const EncyclopediaShipsSchema = z.record(
   z.number(),
   z.object({
      ship_id: z.number(),
      tier: z.number(),
      ship_id_str: z.string()
   })
);

const encyclopediaShips = async (apiId: string, { concurrency = 1, debug = false } = {}) => {
   const { meta, data } = await callApi(
      `https://api.worldofwarships.eu/wows/encyclopedia/ships/?application_id=${apiId}`,
      { debug }
   );

   if (!meta || !meta.page_total)
      throw new Error('Unexpected /encyclopedia/ships response');

   const ships = EncyclopediaShipsSchema.parse(data);
   console.debug(`Loaded encyclopedia page ${meta.page} / ${meta.page_total}`);

   const sem = new Semaphore(concurrency);

   for (let page = 2; page <= meta.page_total; page++)
      void sem.run(async () => {
         const { data } = await callApi(`https://api.worldofwarships.eu/wows/encyclopedia/ships/?application_id=${apiId}&page_no=${page}`);
         Object.assign(ships, EncyclopediaShipsSchema.parse(data));
         console.debug(`Loaded encyclopedia page ${page} / ${meta.page_total}`);
      });

   await sem.wait();
   return ships;
};


/* /clans/list -- Clans whose tags match the given string

Note: The implementation only returns the one clan whose tag is an exact match */

const ClansListSchema = z.array(
   z.object({
      clan_id: z.number(),
      tag: z.string(),
      name: z.string()
   })
);

const clansList = async (apiId: string, region: string, clanTag: string, { debug = false } = {}) => {
   const { data } = await callApi(
      `https://api.worldofwarships.${region}/wows/clans/list/?application_id=${apiId}&search=${clanTag}`,
      { debug }
   );
   const response = ClansListSchema.parse(data);
   const clanInfo = response.find(({ tag }) => tag === clanTag);

   if (!clanInfo)
      throw new Error('Clan tag not found in /clans/list response: ' + clanTag);

   return clanInfo;
};


/* /clans/info -- Information about the given clan, including a list of members */

const ClansInfoSchema = z.record(
   z.number(),
   z.nullable(z.object({ // null for invalid clan identifier
      clan_id: z.number(),
      members_ids: z.array(
         z.number()
      ),
      members: z.record(
         z.number(),
         z.object({
            account_id: z.number(),
            account_name: z.string(),
            role: z.string(),
            joined_at: z.number()
         })
      )
   }))
);

const clansInfoMany = async (apiId: string, region: string, clanIds: number[], { debug = false } = {}) => {
   const { data } = await callApi(
      `https://api.worldofwarships.${region}/wows/clans/info/?application_id=${apiId}&clan_id=${clanIds.join(',')}&extra=members`,
      { debug }
   );
   return ClansInfoSchema.parse(data);
};

const clansInfoOne = async (apiId: string, region: string, clanId: number) => {
   const response = await clansInfoMany(apiId, region, [clanId]);

   if (!response[clanId])
      throw new Error('Clan not found in /clans/info response: ' + clanId);

   return response[clanId];
};


/* /account/info -- Information about given players */

const AccountInfoSchema = z.record(
   z.number(),
   z.object({
      account_id: z.number(),
      nickname: z.string(),
      created_at: z.number(),
      last_battle_time: z.number(),
      statistics: z.nullable(z.object({ // null for private accounts
         pvp: z.optional(z.object({
            battles: z.number(),
            wins: z.number()
         })),
         pvp_solo: z.optional(z.object({
            battles: z.number()
         }))
      }))
   })
);

const accountInfoMany = async (apiId: string, region: string, accountIds: number[], { debug = false } = {}) => {
   const { data } = await callApi(
      `https://api.worldofwarships.${region}/wows/account/info/?application_id=${apiId}&account_id=${accountIds.join(',')}&extra=statistics.pvp_solo`,
      { debug }
   );
   return AccountInfoSchema.parse(data);
};

const accountInfoOne = async (apiId: string, region: string, accountId: number, options = {}) => {
   const response = await accountInfoMany(apiId, region, [accountId], options);

   if (!response[accountId])
      throw new Error('Account not found in /account/info response: ' + accountId);

   return response[accountId];
};


/* /ships/stats -- Given players' stats in different ships */

const ShipsStatsSchema = z.record(
   z.number(),
   z.array(
      z.object({
         ship_id: z.number(),
         pvp: z.object({
            battles: z.number()
         }).optional()
      })
   )
);

const shipsStats = async (apiId: string, region: string, accountId: number, { debug = false } = {})  => {
   const { data } = await callApi(
      `https://api.worldofwarships.${region}/wows/ships/stats/?application_id=${apiId}&account_id=${accountId}`,
      { debug }
   );
   const response = ShipsStatsSchema.parse(data);

   if (!response[accountId])
      throw new Error('Account not found in /ships/stats response: ' + accountId);

   return response[accountId];
};


export default {
   encyclopediaInfo,
   encyclopediaShips,
   clansList,
   clansInfoMany,
   clansInfoOne,
   accountInfoMany,
   accountInfoOne,
   shipsStats
};
