import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAnimation, Variants } from "framer-motion";
import debounce from "lodash.debounce";
import { gql } from "apollo-boost";
import { useQuery } from "@apollo/react-hooks";
import { faBox } from "@fortawesome/free-solid-svg-icons";
import {
  Content,
  Repositories,
  RepositoriesIcon,
  Result,
  ResultList,
  ResultWrapper,
  Root,
  SearchField,
  SearchFieldWrapper,
  UserAvatar,
  UserInfo,
  UserLogin,
  UserName,
} from "./styled";

const searchSchema = gql`
  query searchUsers($query: String!) {
    search(query: $query, type: USER, first: 10) {
      userCount
      nodes {
        ... on User {
          avatarUrl
          name
          url
          login
          repositories {
            totalCount
          }
        }
      }
    }
  }
`;

const resultItemVariant: Variants = {
  visible: (i: number) => ({
    opacity: 1,
    transition: {
      delay: i * 0.15,
      easing: "cubic-bezier(0.33, 1, 0.68, 1)",
    },
  }),
  hidden: {
    opacity: 0,
    transition: {
      easing: "cubic-bezier(0.33, 1, 0.68, 1)",
    },
  },
};

const resultItemAnchorVariant: Variants = {
  visible: (i: number) => ({
    y: 0,
    transition: {
      type: "spring",
      delay: i * 0.15,
    },
  }),
  hidden: {
    y: -3,
  },
};

interface IQueryResultUser {
  avatarUrl: string;
  name: string | null;
  url: string;
  login: string;
  repositories: {
    totalCount: number;
  };
}

interface ISearchQueryResult {
  search: {
    userCount: number;
    nodes: IQueryResultUser[];
  };
}

function App() {
  /**
   * TODO: Coordinate the retraction of the results on a state variable rather than results or value
   *       This way its possible to properly wait for animating out the list items.
   */
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const { loading, data, error } = useQuery<ISearchQueryResult>(searchSchema, {
    variables: { query },
    skip: !query,
  });
  const animationControl = useAnimation();
  const onSearch = useCallback(
    ({ target: { value } }: ChangeEvent<HTMLInputElement>) => setQuery(value),
    [setQuery]
  );
  const results = data ? data.search.nodes : [];

  const animateRetract = useCallback(() => {
    return animationControl.start(
      {
        scaleY: 1,
        scaleX: 1,
      },
      {
        duration: 0.3,
        type: "spring",
        mass: 1,
        tension: 5,
        stiffness: 40,
      }
    );
  }, [animationControl]);

  const debouncedSearch = useMemo(() => {
    const debounced = debounce(onSearch, 400);

    return (event: ChangeEvent<HTMLInputElement>) => {
      event.persist();

      return debounced(event);
    };
  }, [onSearch]);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    debouncedSearch(event);
  };

  useEffect(() => {
    if (loading) {
      (async function () {
        if (results && results.length) {
          await animateRetract();
        }

        return animationControl.start(
          {
            scaleY: 1.03,
            scaleX: 1.03,
          },
          {
            duration: 0.9,
            yoyo: Infinity,
            ease: "easeInOut",
            type: "tween",
          }
        );
      })();
    } else if (results && results.length) {
      animationControl.start(
        {
          scaleX: 1,
          scaleY: 5,
        },
        {
          duration: 0.6,
          type: "spring",
        }
      );
    }
  }, [loading, results, animationControl, animateRetract]);

  useEffect(() => {
    if (!value) {
      animateRetract();
    }
  }, [value, animateRetract]);

  return (
    <Root>
      <Content>
        <SearchFieldWrapper animate={animationControl} />
        <SearchField
          type="text"
          placeholder="type something..."
          onChange={onChange}
        />

        <ResultList>
          {results.map((result, i) => {
            const { name } = result;

            if (name) {
              return (
                <ResultWrapper
                  key={result.login}
                  initial="hidden"
                  animate="visible"
                  variants={resultItemVariant}
                  custom={i}
                >
                  <Result
                    href={result.url}
                    target="_blank"
                    variants={resultItemAnchorVariant}
                    custom={i}
                  >
                    <UserInfo>
                      <UserAvatar src={result.avatarUrl} alt={name} />
                      <UserName>{name}</UserName>
                      <UserLogin>@{result.login}</UserLogin>
                    </UserInfo>

                    <UserInfo>
                      <RepositoriesIcon icon={faBox} />
                      <Repositories>
                        {result.repositories.totalCount}
                      </Repositories>
                    </UserInfo>
                  </Result>
                </ResultWrapper>
              );
            }

            return null;
          })}
        </ResultList>
      </Content>
    </Root>
  );
}

export default App;
