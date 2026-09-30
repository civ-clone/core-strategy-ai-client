import { expect, spy, use } from 'chai';
import AIClient from '@civ-clone/core-ai-client/AIClient';
import Action from '@civ-clone/core-player/Rules/Action';
import AfterTurn from '../PlayerActions/AfterTurn';
import BeforeTurn from '../PlayerActions/BeforeTurn';
import ChoiceMeta from '@civ-clone/core-client/ChoiceMeta';
import ChooseFromList from '../PlayerActions/ChooseFromList';
import Civilization from '@civ-clone/core-civilization/Civilization';
import Effect from '@civ-clone/core-rule/Effect';
import MandatoryPlayerAction from '@civ-clone/core-player/MandatoryPlayerAction';
import Player from '@civ-clone/core-player/Player';
import PlayerAction from '@civ-clone/core-player/PlayerAction';
import RuleRegistry from '@civ-clone/core-rule/RuleRegistry';
import Strategy from '@civ-clone/core-strategy/Strategy';
import StrategyAIClient from '../StrategyAIClient';
import StrategyRegistry from '@civ-clone/core-strategy/StrategyRegistry';
import { instance as rngInstance } from '@civ-clone/core-random';
import * as spies from 'chai-spies';

use(spies);

// Something that needs orders, like a unit or a city with nothing to build.
class Pending extends MandatoryPlayerAction<string> {}

// Stands in for `base-player-action-end-turn`'s `EndTurn`, which `civ1-player` offers whenever nothing else is
// mandatory.
class EndTurnLike extends MandatoryPlayerAction<null> {}

// A `Player` with real `Action` rules: the named items stay mandatory until they are removed from `queue`, and
// `EndTurnLike` is offered once none are left.
const setUpPlayer = (queue: string[]) => {
  const ruleRegistry = new RuleRegistry(),
    player = new Player(ruleRegistry);

  ruleRegistry.register(
    new Action(
      new Effect((player: Player): PlayerAction[] =>
        queue.length > 0
          ? queue.map((item) => new Pending(player, item))
          : [new EndTurnLike(player, null)]
      )
    )
  );

  return player;
};

// Records calls to the `Player`'s action-listing methods, in order. The wrappers are own properties, so the `Player`'s
// own internal `this.actions()` calls are recorded too.
const recordCalls = (player: Player, log: string[]): void =>
  (
    [
      'actions',
      'hasMandatoryActions',
      'mandatoryAction',
      'mandatoryActions',
    ] as const
  ).forEach((method) => {
    const original = player[method].bind(player) as () => any;

    (player as any)[method] = (): any => {
      log.push(method);

      return original();
    };
  });

class LambdaStrategy extends Strategy {
  private _attempt: (action: PlayerAction) => boolean | Promise<boolean>;
  private _handles: (action: PlayerAction) => boolean;

  constructor(
    handles: (action: PlayerAction) => boolean,
    attempt: (action: PlayerAction) => boolean | Promise<boolean>
  ) {
    super(new RuleRegistry());

    this._attempt = attempt;
    this._handles = handles;
  }

  attempt(action: PlayerAction): boolean | Promise<boolean> {
    return this._attempt(action);
  }

  handles(action: PlayerAction): boolean {
    return this._handles(action);
  }
}

// Handles `Pending` by removing its item from the queue.
const completing = (queue: string[], log: string[] = []) =>
  new LambdaStrategy(
    (action) => action instanceof Pending,
    (action) => {
      log.push(`handled ${action.value()}`);
      queue.splice(queue.indexOf(action.value()), 1);

      return true;
    }
  );

const hooks = (log: string[]) =>
  new LambdaStrategy(
    (action) => action instanceof BeforeTurn || action instanceof AfterTurn,
    (action) => {
      log.push(action instanceof BeforeTurn ? 'before' : 'after');

      return false;
    }
  );

class RecordingClient extends StrategyAIClient {
  public unhandled: MandatoryPlayerAction[] = [];

  protected unhandledAction(action: MandatoryPlayerAction): void {
    this.unhandled.push(action);
  }
}

describe('StrategyAIClient', () => {
  describe('takeTurn', () => {
    it('should call `hasMandatoryActions` then `mandatoryAction` once per action, and list actions nowhere else', async () => {
      const queue = ['a', 'b', 'c'],
        player = setUpPlayer(queue),
        strategyRegistry = new StrategyRegistry(),
        calls: string[] = [];

      strategyRegistry.register(completing(queue));
      recordCalls(player, calls);

      await new StrategyAIClient(player, strategyRegistry).takeTurn();

      // Three `Pending`s, then `EndTurnLike`, which ends the turn. `hasMandatoryActions` calls `actions`, and
      // `mandatoryAction` calls `mandatoryActions`, which calls `actions`.
      expect(calls).eql(
        Array.from({ length: 4 }, () => [
          'hasMandatoryActions',
          'actions',
          'mandatoryAction',
          'mandatoryActions',
          'actions',
        ]).flat()
      );
    });

    it('should run `BeforeTurn` and `AfterTurn` once each, around the actions, for every `Strategy` that handles them', async () => {
      const queue = ['a', 'b'],
        player = setUpPlayer(queue),
        strategyRegistry = new StrategyRegistry(),
        log: string[] = [];

      strategyRegistry.register(hooks(log), completing(queue, log), hooks(log));

      await new StrategyAIClient(player, strategyRegistry).takeTurn();

      expect(log).eql([
        'before',
        'before',
        'handled a',
        'handled b',
        'after',
        'after',
      ]);
    });

    it('should pass the player as the value of `BeforeTurn` and `AfterTurn`', async () => {
      const player = setUpPlayer([]),
        strategyRegistry = new StrategyRegistry(),
        seen: PlayerAction[] = [];

      strategyRegistry.register(
        new LambdaStrategy(
          (action) =>
            action instanceof BeforeTurn || action instanceof AfterTurn,
          (action) => {
            seen.push(action);

            return true;
          }
        )
      );

      await new StrategyAIClient(player, strategyRegistry).takeTurn();

      expect(seen.map((action) => action.constructor)).eql([
        BeforeTurn,
        AfterTurn,
      ]);
      seen.forEach((action) => {
        expect(action.player()).equal(player);
        expect(action.value()).equal(player);
      });
    });

    it('should await each action before fetching the next', async () => {
      const queue = ['a', 'b'],
        player = setUpPlayer(queue),
        strategyRegistry = new StrategyRegistry(),
        log: string[] = [];

      strategyRegistry.register(
        new LambdaStrategy(
          (action) => action instanceof Pending,
          async (action) => {
            log.push(`start ${action.value()}`);

            await new Promise((resolve) => setTimeout(resolve, 1));

            queue.splice(queue.indexOf(action.value()), 1);
            log.push(`end ${action.value()}`);

            return true;
          }
        )
      );
      recordCalls(player, log);

      await new StrategyAIClient(player, strategyRegistry).takeTurn();

      expect(log.filter((entry) => !entry.startsWith('actions'))).eql([
        'hasMandatoryActions',
        'mandatoryAction',
        'mandatoryActions',
        'start a',
        'end a',
        'hasMandatoryActions',
        'mandatoryAction',
        'mandatoryActions',
        'start b',
        'end b',
        'hasMandatoryActions',
        'mandatoryAction',
        'mandatoryActions',
      ]);
    });

    it('should end the turn at the first action nothing handles, and still run `AfterTurn`', async () => {
      const queue = ['a', 'b', 'c'],
        player = setUpPlayer(queue),
        strategyRegistry = new StrategyRegistry(),
        log: string[] = [],
        client = new RecordingClient(player, strategyRegistry);

      strategyRegistry.register(
        hooks(log),
        new LambdaStrategy(
          (action) => action instanceof Pending && action.value() !== 'b',
          (action) => {
            log.push(`handled ${action.value()}`);
            queue.splice(queue.indexOf(action.value()), 1);

            return true;
          }
        )
      );

      await client.takeTurn();

      expect(log).eql(['before', 'handled a', 'after']);
      expect(queue).eql(['b', 'c']);
      expect(client.unhandled.length).equal(1);
      expect(client.unhandled[0]).instanceOf(Pending);
      expect(client.unhandled[0].value()).equal('b');
    });

    it("should end the turn at the engine's end-turn action without knowing about it", async () => {
      const queue = ['a'],
        player = setUpPlayer(queue),
        strategyRegistry = new StrategyRegistry(),
        client = new RecordingClient(player, strategyRegistry);

      strategyRegistry.register(completing(queue));

      await client.takeTurn();

      expect(client.unhandled.length).equal(1);
      expect(client.unhandled[0]).instanceOf(EndTurnLike);
    });

    it('should treat an action that a `Strategy` returns `false` for as unhandled', async () => {
      const player = setUpPlayer(['a']),
        strategyRegistry = new StrategyRegistry(),
        client = new RecordingClient(player, strategyRegistry),
        attempt = spy(() => false);

      strategyRegistry.register(new LambdaStrategy(() => true, attempt));

      await client.takeTurn();

      // `BeforeTurn`, `Pending`, `AfterTurn`.
      expect(attempt).called.exactly(3);
      expect(client.unhandled.length).equal(1);
      expect(client.unhandled[0]).instanceOf(Pending);
    });

    describe('errors', () => {
      const throwingOn = (queue: string[], item: string, error: unknown) =>
        new LambdaStrategy(
          (action) => action instanceof Pending,
          (action) => {
            if (action.value() === item) {
              throw error;
            }

            queue.splice(queue.indexOf(action.value()), 1);

            return true;
          }
        );

      it('should reject the turn by default, without running `AfterTurn`', async () => {
        const queue = ['a', 'b', 'c'],
          player = setUpPlayer(queue),
          strategyRegistry = new StrategyRegistry(),
          error = new Error('broken'),
          log: string[] = [];

        strategyRegistry.register(hooks(log), throwingOn(queue, 'b', error));

        let caught: unknown = null;

        await new StrategyAIClient(player, strategyRegistry)
          .takeTurn()
          .catch((reason) => (caught = reason));

        expect(caught).equal(error);
        expect(log).eql(['before']);
        expect(queue).eql(['b', 'c']);
      });

      it('should reject with an `Error` when something that is not one is thrown', async () => {
        const queue = ['a'],
          player = setUpPlayer(queue),
          strategyRegistry = new StrategyRegistry();

        strategyRegistry.register(throwingOn(queue, 'a', 'just a string'));

        let caught: unknown = null;

        await new StrategyAIClient(player, strategyRegistry)
          .takeTurn()
          .catch((reason) => (caught = reason));

        expect(caught).instanceOf(Error);
        expect((caught as Error).message).equal('just a string');
      });

      it('should carry on with the next action when `actionFailed` returns `true`', async () => {
        const queue = ['a', 'b', 'c'],
          player = setUpPlayer(queue),
          strategyRegistry = new StrategyRegistry(),
          error = new Error('broken'),
          log: string[] = [],
          failed: [MandatoryPlayerAction, unknown][] = [];

        class SkippingClient extends StrategyAIClient {
          protected actionFailed(
            action: MandatoryPlayerAction,
            error: unknown
          ): boolean {
            failed.push([action, error]);

            // Like `SimpleAIClient` skipping a unit that couldn't act.
            queue.splice(queue.indexOf(action.value()), 1);

            return true;
          }
        }

        strategyRegistry.register(hooks(log), throwingOn(queue, 'b', error));

        await new SkippingClient(player, strategyRegistry).takeTurn();

        expect(queue).eql([]);
        expect(failed.length).equal(1);
        expect(failed[0][0].value()).equal('b');
        expect(failed[0][1]).equal(error);
        expect(log).eql(['before', 'after']);
      });

      it('should end the turn, and still run `AfterTurn`, when `actionFailed` returns `false`', async () => {
        const queue = ['a', 'b', 'c'],
          player = setUpPlayer(queue),
          strategyRegistry = new StrategyRegistry(),
          log: string[] = [];

        class StoppingClient extends StrategyAIClient {
          protected actionFailed(): boolean {
            return false;
          }
        }

        strategyRegistry.register(
          hooks(log),
          throwingOn(queue, 'b', new Error('broken'))
        );

        await new StoppingClient(player, strategyRegistry).takeTurn();

        expect(queue).eql(['b', 'c']);
        expect(log).eql(['before', 'after']);
      });

      // An `actionFailed` that always carries on must not be able to carry on past the loop guard.
      class ForgivingClient extends StrategyAIClient {
        public failed: unknown[] = [];
        private _hookError: Error;
        private _hook: 'actionLimitReached' | 'unhandledAction';

        constructor(
          player: Player,
          strategyRegistry: StrategyRegistry,
          hook: 'actionLimitReached' | 'unhandledAction',
          hookError: Error
        ) {
          super(player, strategyRegistry);

          this._hook = hook;
          this._hookError = hookError;
        }

        protected actionFailed(
          action: MandatoryPlayerAction,
          error: unknown
        ): boolean {
          this.failed.push(error);

          return true;
        }

        protected actionLimit(): number {
          return 2;
        }

        protected actionLimitReached(): void {
          if (this._hook === 'actionLimitReached') {
            throw this._hookError;
          }
        }

        protected unhandledAction(): void {
          if (this._hook === 'unhandledAction') {
            throw this._hookError;
          }
        }
      }

      (['actionLimitReached', 'unhandledAction'] as const).forEach((hook) =>
        it(`should fail the turn, not call \`actionFailed\`, when \`${hook}\` throws`, async () => {
          const queue = ['a'],
            player = setUpPlayer(queue),
            strategyRegistry = new StrategyRegistry(),
            hookError = new Error(hook),
            log: string[] = [],
            client = new ForgivingClient(
              player,
              strategyRegistry,
              hook,
              hookError
            );

          strategyRegistry.register(
            hooks(log),
            new LambdaStrategy(
              (action) => action instanceof Pending,
              // Stuck, for the limit; unhandled otherwise.
              () => hook === 'actionLimitReached'
            )
          );

          let caught: unknown = null;

          await client.takeTurn().catch((reason) => (caught = reason));

          expect(caught).equal(hookError);
          expect(client.failed).eql([]);
          expect(log).eql(['before']);
        })
      );
    });

    describe('action limit', () => {
      class LimitedClient extends StrategyAIClient {
        public reached: MandatoryPlayerAction[] = [];
        private _limit: number | null;

        constructor(
          player: Player,
          strategyRegistry: StrategyRegistry,
          limit: number | null = null
        ) {
          super(player, strategyRegistry);

          this._limit = limit;
        }

        protected actionLimit(): number {
          return this._limit ?? super.actionLimit();
        }

        protected actionLimitReached(action: MandatoryPlayerAction): void {
          this.reached.push(action);
        }
      }

      // Claims to handle `Pending` but never removes it, so the same action comes back forever.
      const stuck = (attempts: string[]) =>
        new LambdaStrategy(
          (action) => action instanceof Pending,
          (action) => {
            attempts.push(action.value());

            return true;
          }
        );

      it('should offer one more than `actionLimit()` actions, then call `actionLimitReached` and end the turn', async () => {
        const player = setUpPlayer(['a']),
          strategyRegistry = new StrategyRegistry(),
          attempts: string[] = [],
          log: string[] = [],
          calls: string[] = [],
          client = new LimitedClient(player, strategyRegistry, 5);

        strategyRegistry.register(hooks(log), stuck(attempts));
        recordCalls(player, calls);

        await client.takeTurn();

        // As `SimpleAIClient`'s `loopCheck++ > 1e3`: the check follows `mandatoryAction`, so the action that trips it
        // has been fetched but is not offered.
        expect(attempts.length).equal(6);
        expect(
          calls.filter((call) => call === 'hasMandatoryActions').length
        ).equal(7);
        expect(calls.filter((call) => call === 'mandatoryAction').length).equal(
          7
        );
        expect(client.reached.length).equal(1);
        expect(client.reached[0].value()).equal('a');
        expect(log).eql(['before', 'after']);
      });

      it('should default to 1,000, as `SimpleAIClient` does', async () => {
        const player = setUpPlayer(['a']),
          strategyRegistry = new StrategyRegistry(),
          attempts: string[] = [],
          client = new LimitedClient(player, strategyRegistry);

        strategyRegistry.register(stuck(attempts));

        await client.takeTurn();

        expect(attempts.length).equal(1001);
        expect(client.reached.length).equal(1);
      });

      it('should warn and end the turn by default', async () => {
        const player = setUpPlayer(['a']),
          strategyRegistry = new StrategyRegistry(),
          attempts: string[] = [],
          warn = spy.on(console, 'warn', () => {});

        strategyRegistry.register(stuck(attempts));

        try {
          await new StrategyAIClient(player, strategyRegistry).takeTurn();
        } finally {
          spy.restore(console, 'warn');
        }

        expect(attempts.length).equal(1001);
        expect(warn).called.once;
      });
    });
  });

  describe('chooseFromList', () => {
    class CivilizationA extends Civilization {}
    class CivilizationB extends Civilization {}
    class CivilizationC extends Civilization {}

    const meta = () =>
      new ChoiceMeta(
        [CivilizationA, CivilizationB, CivilizationC],
        'choose-civilization'
      );

    it('should return what a `Strategy` chooses, without drawing a random number', async () => {
      const player = setUpPlayer([]),
        strategyRegistry = new StrategyRegistry(),
        randomNumberGenerator = spy(() => 0),
        seen: PlayerAction[] = [];

      strategyRegistry.register(
        new LambdaStrategy(
          (action) => action instanceof ChooseFromList,
          (action) => {
            const data = (action as ChooseFromList).value();

            seen.push(action);
            data.choose(data.meta().choices()[1].value());

            return true;
          }
        )
      );

      const choice = await new StrategyAIClient(
        player,
        strategyRegistry,
        randomNumberGenerator
      ).chooseFromList(meta());

      expect(choice).equal(CivilizationB);
      expect(seen.length).equal(1);
      expect(seen[0].player()).equal(player);
      expect(randomNumberGenerator).not.called();
    });

    it("should fall back to `Client`'s random pick when nothing handles it", async () => {
      const player = setUpPlayer([]),
        values = [0.5, 0.9, 0.1],
        sequence = () => {
          let index = 0;

          return spy(() => values[index++ % values.length]);
        },
        ours = sequence(),
        theirs = sequence(),
        client = new StrategyAIClient(player, new StrategyRegistry(), ours),
        base = new AIClient(player, theirs);

      for (let i = 0; i < values.length; i++) {
        expect(await client.chooseFromList(meta())).equal(
          await base.chooseFromList(meta())
        );
      }

      expect(ours).called.exactly(3);
      expect(theirs).called.exactly(3);
    });

    it('should fall back when a `Strategy` returns `true` without choosing', async () => {
      const player = setUpPlayer([]),
        strategyRegistry = new StrategyRegistry(),
        randomNumberGenerator = spy(() => 0.9);

      strategyRegistry.register(
        new LambdaStrategy(
          (action) => action instanceof ChooseFromList,
          () => true
        )
      );

      expect(
        await new StrategyAIClient(
          player,
          strategyRegistry,
          randomNumberGenerator
        ).chooseFromList(meta())
      ).equal(CivilizationC);
      expect(randomNumberGenerator).called.once;
    });

    it('should discard a choice from a `Strategy` that returns `false`, and fall back if no later one chooses', async () => {
      const player = setUpPlayer([]),
        strategyRegistry = new StrategyRegistry(),
        randomNumberGenerator = spy(() => 0.9),
        attempted: string[] = [];

      strategyRegistry.register(
        new LambdaStrategy(
          (action) => action instanceof ChooseFromList,
          (action) => {
            const data = (action as ChooseFromList).value();

            attempted.push('rejecting');
            data.choose(data.meta().choices()[0].value());

            return false;
          }
        ),
        new LambdaStrategy(
          (action) => action instanceof ChooseFromList,
          () => {
            attempted.push('not choosing');

            return true;
          }
        )
      );

      expect(
        await new StrategyAIClient(
          player,
          strategyRegistry,
          randomNumberGenerator
        ).chooseFromList(meta())
      ).equal(CivilizationC);
      expect(attempted).eql(['rejecting', 'not choosing']);
      expect(randomNumberGenerator).called.once;
    });

    it('should use the first `Strategy` that chooses and returns `true`, and not try later ones', async () => {
      const player = setUpPlayer([]),
        strategyRegistry = new StrategyRegistry(),
        randomNumberGenerator = spy(() => 0.9),
        later = spy(() => true);

      strategyRegistry.register(
        new LambdaStrategy(
          (action) => action instanceof ChooseFromList,
          (action) => {
            const data = (action as ChooseFromList).value();

            data.choose(data.meta().choices()[0].value());

            return true;
          }
        ),
        new LambdaStrategy((action) => action instanceof ChooseFromList, later)
      );

      expect(
        await new StrategyAIClient(
          player,
          strategyRegistry,
          randomNumberGenerator
        ).chooseFromList(meta())
      ).equal(CivilizationA);
      expect(later).not.called();
      expect(randomNumberGenerator).not.called();
    });
  });

  describe('randomness', () => {
    it("should default to `core-random`'s seeded generator", () => {
      const client = new StrategyAIClient(setUpPlayer([]));

      expect((client as any)._randomNumberGenerator).equal(rngInstance);
    });

    it('should never call `Math.random`', async () => {
      const queue = ['a', 'b'],
        player = setUpPlayer(queue),
        strategyRegistry = new StrategyRegistry(),
        random = spy.on(Math, 'random');

      strategyRegistry.register(completing(queue));

      try {
        const client = new StrategyAIClient(
          player,
          strategyRegistry,
          () => 0.5
        );

        await client.takeTurn();
        await client.chooseFromList(
          new ChoiceMeta([Civilization], 'choose-civilization')
        );
      } finally {
        spy.restore(Math, 'random');
      }

      expect(random).not.called();
    });
  });
});
