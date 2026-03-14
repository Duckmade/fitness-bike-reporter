import * as React from "react";
import "../app/globals.css";
import { registerPropsEditor } from "@henosia/design-props";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible } from "@/components/ui/collapsible";
import { Command } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { ContextMenu } from "@/components/ui/context-menu";
import { Dialog } from "@/components/ui/dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { HoverCard } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Menubar } from "@/components/ui/menubar";
import { NavigationMenu } from "@/components/ui/navigation-menu";
import { Popover } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/toaster";
import { Inter as FontSans } from "next/font/google";
const fontSans = FontSans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
});

interface DesignFrameProps extends React.PropsWithChildren<{}> {
  fileName: string;
  document: Document;
  designContext: { theme: string | undefined };
}

export function DesignFrame({
  children,
  designContext: { theme },
}: DesignFrameProps) {
  React.useEffect(() => {
    // also set class name on html so radix popups that mount outside the
    // DesignFrame root div have the same font styling
    const {classList} = document.documentElement;
    classList.add(fontSans.variable);
    classList.add('font-sans');
    classList.add('antialiased');
  }, []);
  return (
    <>
      <div className={`${fontSans.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </div>
    </>
  );
}

/**
 * Returns the default props used for icon previews and insertions on the canvas
 * @param libraryName the library (NPM package) the icon belongs to, e.g. `lucide-react`
 * @param iconComponentName the full name of the component, e.g. `Apple`
 */
export const getIconDefaultProps = (
  libraryName: string,
  iconComponentName: string
): object | null => {
  // don't add a placeholder by `null`-ing children
  return { children: null };
};

registerPropsEditor(Accordion, {
  type: {
    pinned: true,
  },
  collapsible: {
    pinned: true,
  },
  orientation: {
    pinned: true,
  },
  className: {
    pinned: true,
  },
});

registerPropsEditor(Alert, {
  variant: {
    pinned: true,
  },
});

registerPropsEditor(Button, {
  size: {
    pinned: true,
  },
  variant: {
    pinned: true,
  },
  className: {
    pinned: true,
  },
});

registerPropsEditor(Badge, {
  variant: {
    pinned: true,
  },
});

registerPropsEditor(Calendar, {});

registerPropsEditor(Card, {});

registerPropsEditor(Checkbox, {
  id: {
    pinned: true,
  },
  name: {
    pinned: true,
  },
  checked: {
    pinned: true,
  },
  disabled: {
    pinned: true,
  },
});

registerPropsEditor(Collapsible, {
  defaultOpen: {
    pinned: true,
  },
  disabled: {
    pinned: true,
  },
});

registerPropsEditor(Command, {});

registerPropsEditor(ContextMenu, {});

registerPropsEditor(Dialog, {
  open: {
    pinned: true,
  },
  modal: {
    pinned: true,
  },
});

registerPropsEditor(DropdownMenu, {
  open: {
    pinned: true,
  },
  modal: {
    pinned: true,
  },
});

registerPropsEditor(HoverCard, {
  open: {
    pinned: true,
  },
  closeDelay: {
    pinned: true,
  },
  openDelay: {
    pinned: true,
  },
});

registerPropsEditor(Input, {
  id: {
    pinned: true,
  },
  name: {
    pinned: true,
  },
  value: {
    pinned: true,
  },
  children: {
    defaultValue: null,
  },
});

registerPropsEditor(Label, {
  htmlFor: {
    pinned: true,
  },
});

registerPropsEditor(Menubar, {});

registerPropsEditor(NavigationMenu, {
  delayDuration: {
    pinned: true,
  },
  skipDelayDuration: {
    pinned: true,
  },
  orientation: {
    pinned: true,
  },
});

registerPropsEditor(Popover, {
  open: {
    pinned: true,
  },
  modal: {
    pinned: true,
  },
});

registerPropsEditor(Progress, {
  value: {
    pinned: true,
  },
  max: {
    pinned: true,
  },
});

registerPropsEditor(RadioGroup, {
  id: {
    pinned: true,
  },
  name: {
    pinned: true,
  },
  orientation: {
    pinned: true,
  },
  value: {
    pinned: true,
  },
  required: {
    pinned: true,
  },
  disabled: {
    pinned: true,
  },
});

registerPropsEditor(ScrollArea, {
  type: {
    pinned: true,
  },
  scrollHideDelay: {
    pinned: true,
  },
});

registerPropsEditor(Select, {
  name: {
    pinned: true,
  },
  value: {
    pinned: true,
  },
  required: {
    pinned: true,
  },
  disabled: {
    pinned: true,
  },
});

registerPropsEditor(Sheet, {
  open: {
    pinned: true,
  },
  modal: {
    pinned: true,
  },
});

registerPropsEditor(Slider, {
  id: {
    pinned: true,
  },
  name: {
    pinned: true,
  },
  value: {
    pinned: true,
  },
  min: {
    pinned: true,
  },
  max: {
    pinned: true,
  },
  step: {
    pinned: true,
  },
  orientation: {
    pinned: true,
  },
});

registerPropsEditor(Switch, {
  name: {
    pinned: true,
  },
  checked: {
    pinned: true,
  },
  disabled: {
    pinned: true,
  },
  required: {
    pinned: true,
  },
});

registerPropsEditor(Tabs, {
  value: {
    pinned: true,
  },
  orientation: {
    pinned: true,
  },
});

registerPropsEditor(Textarea, {
  id: {
    pinned: true,
  },
  name: {
    pinned: true,
  },
  value: {
    pinned: true,
  },
  required: {
    pinned: true,
  },
  disabled: {
    pinned: true,
  },
});
