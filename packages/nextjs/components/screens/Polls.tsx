import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { useAccount, useSigner } from "wagmi";
import { PlusCircleIcon, TrashIcon } from "@heroicons/react/24/solid";
import {
  useDeployedContractInfo,
  useScaffoldContractWrite,
  useScaffoldEventHistory,
  useScaffoldEventSubscriber,
} from "~~/hooks/scaffold-eth";

export const Polls = () => {
  const { address } = useAccount();
  const [pollsContract, setPollsContract] = useState<any>();
  const [isCreatePollModalOpen, setIsCreatePollModalOpen] = useState<boolean>(false);
  const [pollTitle, setPollTitle] = useState<string>();
  const [newOption, setNewOption] = useState<string>();
  const [pollOptions, setPollOptions] = useState<string[]>([]);
  const [votedPollId, setVotedPollId] = useState<string>("");
  let [polls, setPolls] = useState<any[]>([]);
  const isLoaded = useRef<any>();

  const [isVoting, setOnVoting] = useState<any>({});

  const { data: signer } = useSigner();
  const { data: deployedFactoryInfo } = useDeployedContractInfo("EventPolls");

  const { data: createPoll, writeAsync } = useScaffoldContractWrite({
    contractName: "EventPolls",
    functionName: "createBinaryPoll",

    args: [JSON.stringify({ title: pollTitle, options: [...pollOptions] })],
    value: "0",
  });

  useScaffoldEventSubscriber({
    contractName: "EventPolls",
    eventName: "Voted",
    listener(...args) {
      const votedPollId = [...args][1];
      console.log(`voted..!`);
      setVotedPollId(votedPollId.toString());
    },

    once: false,
  });

  const {
    data: createdPolls,
    isLoading,
    error,
  } = useScaffoldEventHistory({
    contractName: "EventPolls",
    eventName: "PollCreated",
    fromBlock: 0,
  });

  const onCreatePoll = async () => {
    await writeAsync();
  };
  const loadPollDetails = async function (pollId: number) {
    const pollDetails: any = await pollsContract.getPollResults(+pollId);

    polls.push({
      content: JSON.parse(pollDetails.content),
      pollId: pollDetails.pollId.toString(),
      voters: pollDetails.voters,
      results: pollDetails.results,
      isVoted: (pollDetails.voters as any[])?.includes(address),
    });

    polls.map((poll: any) => {
      if (poll.isVoted) {
        const result: any = {};
        const totalVotes = poll.results.length;
        const optionCounts: any = {};

        poll.results.forEach((option: any) => {
          optionCounts[option] = (optionCounts[option] || 0) + 1;
        });

        for (const option in optionCounts) {
          result[option] = `${((optionCounts[option] / totalVotes) * 100).toFixed(0)}`;
        }
        poll.result = result;
      }
    });

    polls.sort((dataA: any, dataB: any) => {
      const pollIdA = parseInt(dataA.pollId);
      const pollIdB = parseInt(dataB.pollId);
      return pollIdB - pollIdA;
    });

    setPolls([...polls]);
  };

  const updateVotedPoll = async (pollId: string, address: string) => {
    pollId = pollId.toString();

    const pollDetails: any = await pollsContract.getPollResults(pollId.toString());

    polls = polls.map(item => {
      if (+item.pollId === +pollId) {
        item = {
          content: JSON.parse(pollDetails.content),
          pollId: pollDetails.pollId.toString(),
          voters: pollDetails.voters,
          results: pollDetails.results,
          isVoted: (pollDetails.voters as any[])?.includes(address),
        };
      }
      return item;
    });

    polls.map((poll: any) => {
      if (poll.isVoted) {
        const result: any = {};
        const totalVotes = poll.results.length;
        const optionCounts: any = {};

        poll.results.forEach((option: any) => {
          optionCounts[option] = (optionCounts[option] || 0) + 1;
        });

        for (const option in optionCounts) {
          result[option] = `${((optionCounts[option] / totalVotes) * 100).toFixed(0)}`;
        }
        poll.result = result;
      }
    });

    polls.sort((dataA: any, dataB: any) => {
      const pollIdA = parseInt(dataA.pollId);
      const pollIdB = parseInt(dataB.pollId);
      return pollIdB - pollIdA;
    });

    setPolls(polls);
    setOnVoting({ [pollId]: false });
  };

  const onVote = async (pollId: string, selected: string) => {
    setOnVoting({ [pollId]: true });

    const tx = await pollsContract.voteOnPoll(selected, pollId);
    const rcpt = await tx.wait();
  };
  const checkRcpt = async (createPoll: any) => {
    const rcpt = await createPoll.wait();
    const nextPollId: any = await pollsContract.nextPollId();

    polls.push({
      content: { title: pollTitle, options: [...pollOptions] },
      pollId: +nextPollId.toString() - 1,
      voters: [],
      results: [],
      isVoted: false,
    });

    polls.sort((dataA: any, dataB: any) => {
      const pollIdA = parseInt(dataA.pollId);
      const pollIdB = parseInt(dataB.pollId);
      return pollIdB - pollIdA;
    });
    setPolls(polls);

    setIsCreatePollModalOpen(false);
  };

  // useEffects

  useEffect(() => {
    if (!isLoading && createdPolls && createdPolls.length > 0) {
      for (const poll of createdPolls) {
        const pollId = +poll.args.pollId.toString() - 1;
        loadPollDetails(pollId);
      }

      isLoaded.current = true;
    }
  }, [isLoading]);

  useEffect(() => {
    if (votedPollId) {
      updateVotedPoll(votedPollId, address as string);
    }
  }, [votedPollId]);

  useEffect(() => {
    if (createPoll) {
      checkRcpt(createPoll);
    }
  }, [createPoll]);

  useEffect(() => {
    if (deployedFactoryInfo && signer && deployedFactoryInfo) {
      const pollsContract = new ethers.Contract(deployedFactoryInfo?.address, deployedFactoryInfo?.abi, signer);
      setPollsContract(pollsContract);
    }
  }, [deployedFactoryInfo, signer]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-around align-middle items-center">
        <h2 className="font-bold mt-4 text-xl">Polls</h2>
        <label
          htmlFor="my_modal_6"
          className="btn btn-ghost btn-xs m-1 w-10"
          onClick={() => {
            setIsCreatePollModalOpen(true);
          }}
        >
          <PlusCircleIcon className="text text-primary" width={30} />
        </label>
      </div>

      <div>
        {polls.map((item, index) => {
          const { content, pollId, isVoted, result, voters } = item;

          return (
            <div className="card w-96 bg-base-100 shadow-xl m-2" key={index}>
              <div className="card-body">
                <h2 className="card-title  flex justify-between">{content?.title}</h2>

                {isVoting[pollId] && (
                  <>
                    <progress className="progress progress-warning m-2 h-2 w-56 "></progress>
                  </>
                )}
                {/* options */}

                {(content?.options as any[]).map((option, index) => {
                  return (
                    <div key={index}>
                      <button
                        disabled={isVoted}
                        className="btn btn-sm  btn-secondary w-full"
                        onClick={() => {
                          onVote(pollId, option);
                        }}
                      >
                        {/* {option} {isVoted && result[option]} */}
                        {option}
                      </button>
                      {isVoted && (
                        <div className="flex justify-start items-center">
                          <progress
                            className="progress progress-success m-2 h-2 w-56 "
                            value={`${isVoted ? result[option] : "0"}`}
                            max="100"
                          ></progress>
                          <span>{isVoted && result[option] ? result[option] : 0} %</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="text-gray-400 text-xs ml-2">{voters.length} voted</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE POLL MODAL */}
      <input type="checkbox" id="my_modal_6" className="modal-toggle" checked={isCreatePollModalOpen} />
      <div className="modal">
        <div className="modal-box">
          <label
            htmlFor="my_modal_6"
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
            onClick={() => {
              setIsCreatePollModalOpen(false);
            }}
          >
            ✕
          </label>
          <h3 className="font-bold text-lg">Create a new poll</h3>
          <p className="py-4">
            <div className="m-2">
              <input
                value={pollTitle}
                onChange={e => {
                  setPollTitle(e.target.value);
                }}
                type="text"
                placeholder="Enter title"
                className="input input-bordered input-primary w-full"
              />
            </div>
            <div className="m-2 flex justify-between">
              <input
                value={newOption}
                onChange={e => {
                  setNewOption(e.target.value);
                }}
                type="text"
                placeholder="Add options"
                className="input input-bordered input-primary w-full"
              />
              <button
                className="btn btn-secondary"
                disabled={!newOption}
                onClick={() => {
                  setPollOptions([...new Set([...pollOptions, newOption])] as any);
                  setNewOption("");
                }}
              >
                +
              </button>
            </div>

            <div className="m-2">
              {pollOptions.map((item, index) => {
                return (
                  <div key={index} className="flex justify-between items-center">
                    <div className="ml-5">
                      {index + 1}. {""}
                      {item}
                    </div>
                    <div className="mr-20">
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                          setPollOptions([...pollOptions.filter(element => element != item)]);
                        }}
                      >
                        <TrashIcon width={19} className="text-error" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </p>
          <div className="modal-action">
            <button
              className="btn"
              disabled={!pollTitle || pollOptions.length <= 1}
              onClick={async () => {
                onCreatePoll();
              }}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
