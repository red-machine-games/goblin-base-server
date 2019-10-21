redis.replicate_commands()

local BATCH_SIZE = KEYS[1]
local RELOADING_MS = tonumber(KEYS[2])
local TIME_TO_CONNECT_PAIR = tonumber(KEYS[3])
local PAIR_INGAME_TTL = tonumber(KEYS[4])
local PAUSED_PAIR_TTS = tonumber(KEYS[5])
local ABSOLUTE_GAMEPLAY_TTL = tonumber(KEYS[6])
local NOW = tonumber(KEYS[7])
local TARGET_BOOKING_KEY = KEYS[8]
local QUOTA_LIFETIME_MS = KEYS[9]
local ROOMS_CAPACITY = tonumber(KEYS[10])

local pids_deleted = {}
local to_update_occupation

local so_divided_batch_size = math.floor(tonumber(BATCH_SIZE) / 4)

local function process_pair_index(target_pinx_key)
    local pair_index = redis.call('hmget', target_pinx_key, 'prid', 'pid')
    if not pair_index[1] then
        return
    end
    local pair_key = 'pair:' .. pair_index[1]
    local pair_stat = redis.call('hmget', pair_key, 'stat', 'upd', 'cat')
    if (pair_stat[1] == '0' or pair_stat[1] == '1' or pair_stat[1] == '2' or pair_stat[1] == '3') then
        if (tonumber(pair_stat[2]) + TIME_TO_CONNECT_PAIR <= NOW) or (tonumber(pair_stat[3]) * 1000 + ABSOLUTE_GAMEPLAY_TTL < NOW) then
            local opponents_pids = redis.call('hmget', pair_key, 'pida', 'pidb', 'opbot')
            local booking_key_a = redis.call('get', 'pidnx:' .. opponents_pids[1])
            if redis.call('get', 'pgoto:' .. opponents_pids[1]) == pair_index[1] then
                redis.call('del', 'pgoto:' .. opponents_pids[1])
            end
            redis.call('del', 'pidnx:' .. opponents_pids[1], target_pinx_key)
            if not booking_key_a then
                redis.call('del', pair_key, 'pq:' .. pair_index[1])
            elseif target_pinx_key ~= 'pinx:' .. booking_key_a then
                redis.call('del', pair_key, 'pinx:' .. booking_key_a, 'pq:' .. pair_index[1], 'sq:' .. booking_key_a)
            else
                redis.call('del', pair_key, 'pq:' .. pair_index[1], 'sq:' .. booking_key_a)
            end
            if opponents_pids[3] ~= '1' then
                local booking_key_b = redis.call('get', 'pidnx:' .. opponents_pids[2])
                if redis.call('get', 'pgoto:' .. opponents_pids[2]) == pair_index[1] then
                    redis.call('del', 'pgoto:' .. opponents_pids[2])
                end
                if redis.call('get', 'pidnx:' .. opponents_pids[2]) == booking_key_b then
                    redis.call('del', 'pidnx:' .. opponents_pids[2])
                end
                if booking_key_b then
                    redis.call('del', 'pinx:' .. booking_key_b, 'sq:' .. booking_key_b)
                end
            end
            if opponents_pids[1] then
                table.insert(pids_deleted, opponents_pids[1])
            end
            if opponents_pids[2] then
                table.insert(pids_deleted, opponents_pids[2])
            end
        end
    elseif pair_stat[1] == '4' then
        local paused = redis.call('hmget', pair_key, 'pseda', 'psedb')
        local timed_out = false
        local dont_tell_anyone = false
        if tonumber(pair_stat[3]) * 1000 + ABSOLUTE_GAMEPLAY_TTL < NOW then
            timed_out = true
            dont_tell_anyone = true
        elseif paused[1] == '1' or paused[2] == '1' then
            if tonumber(pair_stat[2]) + PAUSED_PAIR_TTS <= NOW then
                timed_out = true
            end
        elseif tonumber(pair_stat[2]) + PAIR_INGAME_TTL <= NOW then
            timed_out = true
        end
        if timed_out then
            local opponents_pids_and_stuff = redis.call('hmget', pair_key, 'pida', 'pidb', 'opbot', 'cat', 'lmsga', 'lmsgb')
            local booking_key_a = redis.call('get', 'pidnx:' .. opponents_pids_and_stuff[1])
            redis.call('del', 'pidnx:' .. opponents_pids_and_stuff[1], target_pinx_key)
            if booking_key_a and target_pinx_key ~= 'pinx:' .. booking_key_a then
                redis.call('del', 'pinx:' .. booking_key_a)
            end
            if opponents_pids_and_stuff[3] ~= '1' then
                local booking_key_b = redis.call('get', 'pidnx:' .. opponents_pids_and_stuff[2])
                redis.call('del', 'pidnx:' .. opponents_pids_and_stuff[2])
                if booking_key_b then
                    redis.call('del', 'pinx:' .. booking_key_b)
                end
                if not dont_tell_anyone then table.insert(pids_deleted, opponents_pids_and_stuff[2]) end
            end
            local player_a_lag = tonumber(opponents_pids_and_stuff[5]) - tonumber(opponents_pids_and_stuff[4])
            local pair_model = redis.call('hget', pair_key, 'mdl') or '-1'
            local opponents_hids = redis.call('hmget', pair_key, 'hida', 'hidb')
            redis.call('del', pair_key)
            redis.call('set', 'qot:' .. pair_index[1] .. ':2', pair_model, 'px', QUOTA_LIFETIME_MS)
            if opponents_pids_and_stuff[3] ~= '1' then
                local player_b_lag = tonumber(opponents_pids_and_stuff[6]) - tonumber(opponents_pids_and_stuff[4])
                redis.call(
                        'publish',
                        'gr-pub',
                        '-1//2;0;' .. opponents_pids_and_stuff[1] .. ';' .. opponents_pids_and_stuff[2] .. ';' ..
                                opponents_hids[1] .. ';' .. opponents_hids[2] .. ';' ..
                                player_a_lag .. ';' .. player_b_lag .. ';;' .. pair_index[1]
                )
            else
                redis.call(
                        'publish', 'gr-pub', '-1//2;1;' .. opponents_pids_and_stuff[1] .. ';' .. opponents_pids_and_stuff[2]
                                .. ';' .. opponents_hids[1] .. ';' .. opponents_hids[2] .. ';' ..
                                player_a_lag .. ';-1;;' .. pair_index[1])
            end
        end
    else
        redis.call('del', target_pinx_key)
    end
end

if TARGET_BOOKING_KEY ~= '-1' then
    process_pair_index('pinx:' .. TARGET_BOOKING_KEY)
end

local prev_scan_ts = redis.call('get', 'pairs_scan_ts')

if not prev_scan_ts or tonumber(prev_scan_ts) + RELOADING_MS <= NOW then
    local a_cursor = redis.call('get', 'pairs_scan_cur') or '0'

    local sc = redis.call('scan', a_cursor, 'match', 'pinx:*', 'count', so_divided_batch_size)

    redis.call('set', 'pairs_scan_cur', sc[1])
    redis.call('set', 'pairs_scan_ts', NOW)

    for i=1, #sc[2], 1 do
        process_pair_index(sc[2][i])
    end
end

if #pids_deleted > 0 then
    for i=1, #pids_deleted, 1 do
        redis.call('publish', 'gr-pub', pids_deleted[i] .. '//10')
    end
end

local function process_mlk_pair_index(target_pair_key)
    local pair_stuff = redis.call('hmget', target_pair_key, 'stat', 'upd', 'cat')
    local timed_out = false

    if tonumber(pair_stuff[3]) * 1000 + ABSOLUTE_GAMEPLAY_TTL < NOW then
        timed_out = true
    elseif (pair_stuff[1] == '0' or pair_stuff[1] == '1' or pair_stuff[1] == '2' or pair_stuff[1] == '3') then
        timed_out = (tonumber(pair_stuff[2]) + TIME_TO_CONNECT_PAIR <= NOW)
    elseif pair_stuff[1] == '4' then
        local paused = redis.call('hmget', target_pair_key, 'pseda', 'psedb')
        if paused[1] == '1' or paused[2] == '1' then
            if tonumber(pair_stuff[2]) + PAUSED_PAIR_TTS <= NOW then
                timed_out = true
            end
        elseif tonumber(pair_stuff[2]) + PAIR_INGAME_TTL <= NOW then
            timed_out = true
        end
    end

    if timed_out then
        local pair_pids = redis.call('hmget', target_pair_key, 'pida', 'pidb')
        if pair_pids[1] or pair_pids[2] then
            local to_delete = false
            local pidnx_a_key, pidnx_b_key, pinx_a_key, pinx_b_key
            local pidnx_a, pidnx_b, pinx_a, pinx_b
            if pair_pids[1] then
                pidnx_a_key = 'pidnx:' .. pair_pids[1]
                pidnx_a = redis.call('get', pidnx_a_key)
                to_delete = not pidnx_a
            end
            if pair_pids[2] then
                pidnx_b_key = 'pidnx:' .. pair_pids[2]
                pidnx_b = redis.call('get', pidnx_b_key)
                to_delete = to_delete or not pidnx_b
            end
            local pair_id = target_pair_key:sub(6)
            if pidnx_a or pidnx_b then
                if pidnx_a then
                    pinx_a_key = 'pinx:' .. pidnx_a
                    pinx_a = redis.call('hmget', pinx_a_key, 'prid', 'pid')
                    to_delete = to_delete or (not pinx_a[1] or (pinx_a[1] and (pinx_a[1] ~= pair_id or pinx_a[2] ~= pair_pids[1])))
                end
                if pidnx_b then
                    pinx_b_key = 'pinx:' .. pidnx_b
                    pinx_b = redis.call('hmget', pinx_b_key, 'prid', 'pid')
                    to_delete = to_delete or (not pinx_b[1] or (pinx_b[1] and (pinx_b[1] ~= pair_id or pinx_b[2] ~= pair_pids[2])))
                end
            end
            if to_delete then
                local to_delete_tab = {target_pair_key}
                if pidnx_a then
                    table.insert(to_delete_tab, pidnx_a_key)
                end
                if pidnx_b then
                    table.insert(to_delete_tab, pidnx_b_key)
                end
                if pinx_a and pinx_a[1] then
                    table.insert(to_delete_tab, pinx_a_key)
                end
                if pinx_b and pinx_b[1] then
                    table.insert(to_delete_tab, pinx_b_key)
                end
                redis.call('del', unpack(to_delete_tab))
            end
        end
    end
end

local mlk_pair_scan_ts = redis.call('get', 'mlk_pair_scan_ts')

if not mlk_pair_scan_ts or tonumber(mlk_pair_scan_ts) + RELOADING_MS <= NOW then
    local mlk_pair_scan_cur = redis.call('get', 'mlk_pair_scan_cur') or '0'

    local scan = redis.call('scan', mlk_pair_scan_cur, 'match', 'pair:*', 'count', so_divided_batch_size)

    if scan[1] == '0' then
        to_update_occupation = ROOMS_CAPACITY - (tonumber(redis.call('get', 'the_occupation_counter') or '0') + #scan[2])
        redis.call('del', 'the_occupation_counter')
    else
        redis.call('incrby', 'the_occupation_counter', #scan[2])
    end

    redis.call('set', 'mlk_pair_scan_cur', scan[1])
    redis.call('set', 'mlk_pair_scan_ts', NOW)

    for i=1, #scan[2], 1 do
        process_mlk_pair_index(scan[2][i])
    end
end

local function process_mlk_pinx(target_pinx_key)
    local pinx_prid = redis.call('hget', target_pinx_key, 'prid')
    if not pinx_prid then
        return false
    else
        local the_pair = redis.call('exists', 'pair:' .. pinx_prid)
        if the_pair == 0 then
            redis.call('del', target_pinx_key)
            return false
        else
            return true
        end
    end
end
local function process_mlk_pidnx(target_pidnx_key)
    local pidnx = redis.call('get', target_pidnx_key)
    if pidnx then
        local pinx_is_okay = process_mlk_pinx('pinx:' .. pidnx)
        if not pinx_is_okay then
            redis.call('del', target_pidnx_key)
        end
    end
end

local mlk_pidnx_scan_ts = redis.call('get', 'mlk_pidnx_scan_ts')

if not mlk_pidnx_scan_ts or tonumber(mlk_pidnx_scan_ts) + RELOADING_MS <= NOW then
    local mlk_pidnx_scan_cur = redis.call('get', 'mlk_pidnx_scan_cur') or '0'

    local scan = redis.call('scan', mlk_pidnx_scan_cur, 'match', 'pidnx:*', 'count', so_divided_batch_size)

    redis.call('set', 'mlk_pidnx_scan_cur', scan[1])
    redis.call('set', 'mlk_pidnx_scan_ts', NOW)

    for i=1, #scan[2], 1 do
        process_mlk_pidnx(scan[2][i])
    end
end

local mlk_pinx_scan_ts = redis.call('get', 'mlk_pinx_scan_ts')

if not mlk_pinx_scan_ts or tonumber(mlk_pinx_scan_ts) + RELOADING_MS <= NOW then
    local mlk_pinx_scan_cur = redis.call('get', 'mlk_pinx_scan_cur') or '0'

    local scan = redis.call('scan', mlk_pinx_scan_cur, 'match', 'pinx:*', 'count', so_divided_batch_size)

    redis.call('set', 'mlk_pinx_scan_cur', scan[1])
    redis.call('set', 'mlk_pinx_scan_ts', NOW)

    for i=1, #scan[2], 1 do
        process_mlk_pinx(scan[2][i])
    end
end

if to_update_occupation then
    local the_occupation_delta = to_update_occupation - tonumber(redis.call('get', 'the_occupation') or '0')
    if the_occupation_delta ~= 0 then
        redis.call('set', 'the_occupation', to_update_occupation)
        return '1;' .. tostring(to_update_occupation)
    else
        return nil
    end
end