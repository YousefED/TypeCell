import React from "react";
import styles from "./SideMenu.module.css";
import { MenuGroup, ButtonItem } from "@atlaskit/menu";

type Props = {
  onDelete: () => void;
};

/**
 * A side menu is created for each block. This is wrapped in a Tippy instance.
 * @param props none;
 * @returns React.FC
 */
const SideMenu = (props: Props) => {
  return (
    <div className={styles.menuList}>
      <MenuGroup>
        <ButtonItem onClick={props.onDelete}>Delete</ButtonItem>
        <ButtonItem isDisabled={true}>Item 2</ButtonItem>
      </MenuGroup>
    </div>
  );
};

export default SideMenu;