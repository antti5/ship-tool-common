import z from 'zod';
import Util from '../Util.js';
import Semaphore from '../Semaphore.js';


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
      throw Error(`Wargaming API error: ${response?.error?.message}`);

   return response;
};


/* /encyclopedia/info -- Contains current game version */

const EncyclopediaInfoSchema = z.object({
   game_version: z.string()
});

const encyclopediaInfo = async (applicationId: string, { debug = false } = {}) => {
   const { data } = await callApi(
      'https://api.worldofwarships.eu/wows/encyclopedia/info/',
      {
         urlSearchParams: {
            application_id: applicationId
         },
         debug
      }
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

const encyclopediaShips = async (applicationId: string, { concurrency = 1, debug = false } = {}) => {
   const { meta, data } = await callApi(
      'https://api.worldofwarships.eu/wows/encyclopedia/ships/',
      {
         urlSearchParams: {
            application_id: applicationId
         },
         debug
      }
   );

   if (!meta || !meta.page_total)
      throw Error('Unexpected /encyclopedia/ships response');

   const ships = EncyclopediaShipsSchema.parse(data);
   console.debug(`Loaded encyclopedia page ${meta.page} / ${meta.page_total}`);

   const sem = new Semaphore(concurrency);

   for (let page = 2; page <= meta.page_total; page++)
      void sem.run(async () => {
         const { data } = await callApi(
            'https://api.worldofwarships.eu/wows/encyclopedia/ships/',
            {
               urlSearchParams: {
                  application_id: applicationId,
                  page_no: page
               },
               debug
            }
         );
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

const clansList = async (applicationId: string, region: string, clanTag: string, { debug = false } = {}) => {
   const { data } = await callApi(
      `https://api.worldofwarships.${region}/wows/clans/list/`,
      {
         urlSearchParams: {
            application_id: applicationId,
            search: clanTag
         },
         debug
      }
   );
   const response = ClansListSchema.parse(data);
   const clanInfo = response.find(({ tag }) => tag === clanTag);

   if (!clanInfo)
      throw Error('Clan tag not found in /clans/list response: ' + clanTag);

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

const clansInfoMany = async (applicationId: string, region: string, clanIds: number[], { debug = false } = {}) => {
   const { data } = await callApi(
      `https://api.worldofwarships.${region}/wows/clans/info/`,
      {
         urlSearchParams: {
            application_id: applicationId,
            clan_id: clanIds.join(','),
            extra: 'members'
         },
         debug
      }
   );
   return ClansInfoSchema.parse(data);
};

const clansInfoOne = async (apiId: string, region: string, clanId: number) => {
   const response = await clansInfoMany(apiId, region, [clanId]);

   if (!response[clanId])
      throw Error('Clan not found in /clans/info response: ' + clanId);

   return response[clanId];
};


/* /clans/accountInfo -- Get information about players' clan membership */

const ClansAccountInfoSchema = z.record(
   z.number(),
   z.nullable(z.object({ // null for invalid player identifier
      account_id: z.number(),
      clan: z.nullable(z.object({ // null if player is not in a clan
         clan_id: z.number(),
         tag: z.string(),
         name: z.string()
      }))
   }))
);

const clansAccountInfo = async (applicationId: string, region: string, accountIds: number[], { debug = false } = {}) => {
   const { data } = await callApi(
      `https://api.worldofwarships.${region}/wows/clans/accountinfo/`,
      {
         urlSearchParams: {
            application_id: applicationId,
            account_id: accountIds.join(','),
            extra: 'clan'
         },
         debug
      }
   );
   return ClansAccountInfoSchema.parse(data);
};


/* /clans/season -- Information about clan battle seasons */

const ClansSeasonSchema = z.record(
   z.number(),
   z.object({
      start_time: z.number()
   })
);

const clansSeason = async (applicationId: string, { debug = false } = {}) => {
   const { data } = await callApi(
      'https://api.worldofwarships.eu/wows/clans/season/',
      {
         urlSearchParams: {
            application_id: applicationId
         },
         debug
      }
   );
   return ClansSeasonSchema.parse(data);
};


/* /account/list -- List of players */

const AccountListSchema = z.array(
   z.object({
      account_id: z.number(),
      nickname: z.string()
   })
);

const accountListExact = async (applicationId: string, region: string, nicknames: string[], { debug = false } = {}) => {
   const { data } = await callApi(
      `https://api.worldofwarships.${region}/wows/account/list/`,
      {
         urlSearchParams: {
            application_id: applicationId,
            search: nicknames.join(','),
            type: 'exact'
         },
         debug
      }
   );
   return AccountListSchema.parse(data);
};


/* /account/info -- Information about given players */

const AccountInfoSchema = z.record(
   z.number(),
   z.object({
      account_id: z.number(),
      nickname: z.string(),
      created_at: z.number(),
      last_battle_time: z.number(),
      hidden_profile: z.boolean(),
      statistics: z.nullable(z.object({ // null for private accounts
         pvp: z.optional(z.object({
            battles: z.number(),
            wins: z.number()
         })),
         pvp_solo: z.optional(z.object({
            battles: z.number(),
            wins: z.number()
         })),
         pvp_div2: z.optional(z.object({
            battles: z.number(),
            wins: z.number()
         })),
         pvp_div3: z.optional(z.object({
            battles: z.number(),
            wins: z.number()
         })),
      }))
   })
);

const accountInfoMany = async (applicationId: string, region: string, accountIds: number[], { debug = false, divisionStats = false } = {}) => {
   const { data } = await callApi(
      `https://api.worldofwarships.${region}/wows/account/info/`,
      {
         urlSearchParams: {
            application_id: applicationId,
            account_id: accountIds.join(','),
            ...(divisionStats && { extra: 'statistics.pvp_solo,statistics.pvp_div2,statistics.pvp_div3' })
         },
         debug
      }   );
   return AccountInfoSchema.parse(data);
};

const accountInfoOne = async (applicationId: string, region: string, accountId: number, { debug = false, divisionStats = false } = {}) => {
   const response = await accountInfoMany(applicationId, region, [accountId], { debug, divisionStats });

   if (!response[accountId])
      throw Error('Account not found in /account/info response: ' + accountId);

   return response[accountId];
};


/* /ships/stats -- Given players' stats in different ships */

const ShipsStatsSchema = z.record(
   z.number(),
   z.array(
      z.object({
         ship_id: z.number(),
         pvp: z.object({
            battles: z.number(),
            wins: z.number(),
            damage_dealt: z.number(),
            frags: z.number()
         }).optional()
      })
   )
);

const shipsStats = async (applicationId: string, region: string, accountId: number, shipIds: number[] | null, { debug = false } = {})  => {
   const { data } = await callApi(
      `https://api.worldofwarships.${region}/wows/ships/stats/`,
      {
         urlSearchParams: {
            application_id: applicationId,
            account_id: accountId,
            ...(shipIds !== null && shipIds.length < 100 && { ship_id: shipIds.join(',') })
         },
         debug
      }
   );
   const response = ShipsStatsSchema.parse(data);

   if (!response[accountId])
      throw Error('Account not found in /ships/stats response: ' + accountId);

   /* If ship identifiers are listed, remove unlisted from response */
   if (shipIds)
      return response[accountId].filter(shipStats => shipIds.includes(shipStats.ship_id));
   else
      return response[accountId];
};

const shipsStatsAll = async (applicationId: string, region: string, accountId: number, { debug = false } = {}) => {
   return await shipsStats(applicationId, region, accountId, null, { debug });
};


export default {
   encyclopediaInfo,
   encyclopediaShips,
   clansList,
   clansInfoMany,
   clansInfoOne,
   clansAccountInfo,
   clansSeason,
   accountListExact,
   accountInfoMany,
   accountInfoOne,
   shipsStats,
   shipsStatsAll
};
